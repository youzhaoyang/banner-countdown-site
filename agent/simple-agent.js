/**
 * Simple Agent (MVP)
 * - planning -> tool call -> response
 * - no external dependency (Node 18+)
 */
const { createLiblibToolsFromEnv } = require("./liblib-tools");

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (_err) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Model output is not valid JSON.");
  }
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function buildAuthHeaders(options = {}) {
  const authType = options.authType || "bearer";
  if (authType === "none") {
    return {};
  }
  if (authType === "bearer") {
    if (!options.apiKey) {
      throw new Error("apiKey is required when authType=bearer");
    }
    return { Authorization: `Bearer ${options.apiKey}` };
  }
  if (authType === "aksk") {
    if (!options.accessKey || !options.secretKey) {
      throw new Error("accessKey and secretKey are required when authType=aksk");
    }
    return {
      [options.accessKeyHeader || "X-Access-Key"]: options.accessKey,
      [options.secretKeyHeader || "X-Secret-Key"]: options.secretKey,
    };
  }
  throw new Error(`Unsupported authType: ${authType}`);
}

class ToolRegistry {
  constructor(tools = []) {
    this.tools = new Map();
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool) {
    if (!tool || !tool.name || typeof tool.execute !== "function") {
      throw new Error("Invalid tool definition.");
    }
    this.tools.set(tool.name, tool);
  }

  listForModel() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description || "",
      input_schema: t.inputSchema || { type: "object", properties: {} },
    }));
  }

  async run(name, input, context) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(input || {}, context);
  }
}

class SimpleAgent {
  constructor(options) {
    this.name = options.name || "video-agent-mvp";
    this.maxSteps = options.maxSteps || 6;
    this.model = options.model;
    this.toolRegistry = new ToolRegistry(options.tools || []);
    this.onEvent = options.onEvent || (() => {});
    this.systemPrompt =
      options.systemPrompt ||
      [
        "You are an assistant that must return strict JSON.",
        "Goal: solve user request with minimal steps, call tools when needed.",
        "Output schema:",
        '{"action":"tool|respond|finish","tool":"","tool_input":{},"response":"","reason":""}',
        "Rules:",
        "- action=tool: fill tool and tool_input",
        "- action=respond/finish: fill response",
      ].join("\n");
  }

  async run(userInput, runtime = {}) {
    if (!this.model || typeof this.model.generate !== "function") {
      throw new Error("Model is required and must implement generate().");
    }

    const traceId = runtime.traceId || `trace_${Date.now()}`;
    const context = {
      conversationId: runtime.conversationId || "conv_demo",
      threadId: runtime.threadId || "thread_demo",
      projectId: runtime.projectId || "project_demo",
      workflowSnapshot: runtime.workflowSnapshot || {},
      memory: runtime.memory || [],
      traceId,
    };

    const messages = [
      { role: "system", content: this.systemPrompt },
      {
        role: "system",
        content: `TOOLS:\n${JSON.stringify(this.toolRegistry.listForModel(), null, 2)}`,
      },
      {
        role: "system",
        content: `WORKFLOW_SNAPSHOT:\n${JSON.stringify(context.workflowSnapshot)}`,
      },
      { role: "user", content: userInput },
    ];

    const stepLogs = [];

    for (let step = 1; step <= this.maxSteps; step += 1) {
      this.onEvent({
        type: "AGENT_STEP_START",
        ts: nowIso(),
        traceId,
        step,
      });

      const raw = await this.model.generate({ messages, traceId });
      const plan = safeJsonParse(raw);

      stepLogs.push({
        step,
        raw,
        parsed: plan,
      });

      this.onEvent({
        type: "AGENT_PLAN",
        ts: nowIso(),
        traceId,
        step,
        plan,
      });

      if (plan.action === "tool") {
        const toolName = plan.tool;
        const toolInput = plan.tool_input || {};

        messages.push({
          role: "assistant",
          content: JSON.stringify(plan),
        });

        try {
          const toolResult = await this.toolRegistry.run(toolName, toolInput, context);
          this.onEvent({
            type: "TOOL_RESULT",
            ts: nowIso(),
            traceId,
            step,
            tool: toolName,
            ok: true,
          });
          messages.push({
            role: "tool",
            content: JSON.stringify({ tool: toolName, result: toolResult }),
          });
          continue;
        } catch (error) {
          this.onEvent({
            type: "TOOL_RESULT",
            ts: nowIso(),
            traceId,
            step,
            tool: toolName,
            ok: false,
            error: String(error.message || error),
          });
          messages.push({
            role: "tool",
            content: JSON.stringify({
              tool: toolName,
              error: String(error.message || error),
            }),
          });
          continue;
        }
      }

      if (plan.action === "respond" || plan.action === "finish") {
        return {
          traceId,
          message: plan.response || "",
          reason: plan.reason || "",
          steps: stepLogs,
        };
      }

      messages.push({
        role: "assistant",
        content: JSON.stringify({
          action: "respond",
          response:
            "Invalid action. Please use one of: tool/respond/finish in strict JSON.",
        }),
      });
    }

    return {
      traceId,
      message: "Max steps reached without finish.",
      reason: "MAX_STEPS",
      steps: stepLogs,
    };
  }
}

function createHttpJsonTool(options) {
  return {
    name: options.name,
    description: options.description || "",
    inputSchema: options.inputSchema || { type: "object", properties: {} },
    execute: async (input, context) => {
      const headers = {
        "Content-Type": "application/json",
        ...buildAuthHeaders({
          authType: options.authType || "none",
          apiKey: options.apiKey,
          accessKey: options.accessKey,
          secretKey: options.secretKey,
          accessKeyHeader: options.accessKeyHeader,
          secretKeyHeader: options.secretKeyHeader,
        }),
        ...(options.headers || {}),
      };
      const body = options.mapInput ? options.mapInput(input, context) : input;
      const res = await fetch(options.url, {
        method: options.method || "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${options.name} HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      return options.mapOutput ? options.mapOutput(data, context) : data;
    },
  };
}

function createOpenAICompatibleModel(options) {
  return {
    generate: async ({ messages }) => {
      const res = await fetch(options.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders({
            authType: options.authType || "bearer",
            apiKey: options.apiKey,
            accessKey: options.accessKey,
            secretKey: options.secretKey,
            accessKeyHeader: options.accessKeyHeader,
            secretKeyHeader: options.secretKeyHeader,
          }),
          ...(options.headers || {}),
        },
        body: JSON.stringify({
          model: options.model,
          temperature: 0.2,
          messages,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Model HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Model response missing choices[0].message.content");
      }
      return content;
    },
  };
}

function createModelFromEnv() {
  const authType = process.env.MODEL_AUTH_TYPE || "bearer";
  return createOpenAICompatibleModel({
    baseUrl: assertEnv("MODEL_BASE_URL"),
    model: assertEnv("MODEL_NAME"),
    authType,
    apiKey: process.env.MODEL_API_KEY,
    accessKey: process.env.MODEL_ACCESS_KEY,
    secretKey: process.env.MODEL_SECRET_KEY,
    accessKeyHeader: process.env.MODEL_ACCESS_KEY_HEADER || "X-Access-Key",
    secretKeyHeader: process.env.MODEL_SECRET_KEY_HEADER || "X-Secret-Key",
  });
}

function createFileSearchToolFromEnv() {
  if (!process.env.FILESEARCH_URL) {
    return null;
  }
  const authType = process.env.FILESEARCH_AUTH_TYPE || "none";
  return createHttpJsonTool({
    name: "FileSearch",
    description: "Search text snippets from files (pdf/doc/txt).",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        file_ids: { type: "array", items: { type: "string" } },
      },
      required: ["query"],
    },
    url: process.env.FILESEARCH_URL,
    method: process.env.FILESEARCH_METHOD || "POST",
    authType,
    apiKey: process.env.FILESEARCH_API_KEY,
    accessKey: process.env.FILESEARCH_ACCESS_KEY,
    secretKey: process.env.FILESEARCH_SECRET_KEY,
    accessKeyHeader: process.env.FILESEARCH_ACCESS_KEY_HEADER || "X-Access-Key",
    secretKeyHeader: process.env.FILESEARCH_SECRET_KEY_HEADER || "X-Secret-Key",
    mapInput: (input, context) => ({
      query: input.query,
      file_ids: input.file_ids || [],
      project_id: context.projectId,
      thread_id: context.threadId,
    }),
  });
}

async function demo() {
  const useRealApi = process.env.USE_REAL_API === "1";
  const useLiblibTools = process.env.USE_LIBLIB_TOOLS === "1";
  const demoFirstTool = useLiblibTools ? "LiblibSeedream45" : "FileSearch";
  const demoToolInput = useLiblibTools
    ? {
        prompt: "电影感人物肖像，柔和光影，高级感海报",
        width: 2048,
        height: 2048,
        imgCount: 1,
      }
    : { query: "提取剧情梗概" };
  const model = useRealApi
    ? createModelFromEnv()
    : {
        generate: async ({ messages }) => {
          const toolMessages = messages.filter((m) => m.role === "tool");
          if (toolMessages.length === 0) {
            return JSON.stringify({
              action: "tool",
              tool: demoFirstTool,
              tool_input: demoToolInput,
              reason: "Demo: call configured tool first",
            });
          }
          const lastToolMessage = toolMessages[toolMessages.length - 1];
          const lastToolData = safeJsonParse(lastToolMessage.content || "{}");
          if (lastToolData.error) {
            return JSON.stringify({
              action: "finish",
              response: `工具调用失败：${lastToolData.error}`,
              reason: "TOOL_ERROR",
            });
          }
          return JSON.stringify({
            action: "finish",
            response: "已完成模型调用并获得任务ID，可继续轮询状态。",
            reason: "Tool execution done",
          });
        },
      };

  const liblibTools = useLiblibTools ? createLiblibToolsFromEnv() : [];
  const realFileSearchTool = useRealApi ? createFileSearchToolFromEnv() : null;
  const tools = [];
  if (realFileSearchTool) {
    tools.push(realFileSearchTool);
  }
  if (liblibTools.length > 0) {
    tools.push(...liblibTools);
  }
  if (tools.length === 0) {
    tools.push(
        {
          name: "FileSearch",
          description: "Search text snippets from project files (PDF/doc/txt).",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
          },
          execute: async (input) => {
            return {
              query: input.query,
              snippets: [
                "剧情围绕主角成长与复仇展开。",
                "第一集前情提要强调家族冲突。",
              ],
            };
          },
        }
    );
  }

  const agent = new SimpleAgent({
    model,
    tools,
    onEvent: (e) => {
      console.log("[event]", JSON.stringify(e));
    },
  });

  const result = await agent.run("请生成一个包含 3 个镜头的短视频方案");
  console.log("[result]", JSON.stringify(result, null, 2));
}

module.exports = {
  SimpleAgent,
  ToolRegistry,
  createHttpJsonTool,
  createOpenAICompatibleModel,
  buildAuthHeaders,
};

if (require.main === module) {
  demo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
