# Video Agent 架构清单与执行步骤（MVP）

## 1) 架构清单

### A. 核心模块
- `IM/Canvas Gateway`: 负责 WebSocket/HTTP 入站、出站流式推送。
- `Message Store`: 存 `conversation_id/thread_id/message_id/project_id/event_type/payload/timestamp`。
- `Agent Runtime`: 负责 `planning -> tool call -> state update -> response`。
- `Tool Registry`: 统一注册工具定义、参数 schema、超时、重试、幂等键。
- `Model Gateway`: 统一对接多模型（如 Gemini/Kimi/Qwen/OpenAI-Compatible）。
- `Task State`: 管理 `pending/running/success/failed/stopped`，支持 stop/rollback。
- `Trace/Log`: 一次 request-response 一个 trace，记录每一步工具调用与模型输出。

### B. 一期工具（建议最小集）
- `FileSearch`: 检索文档文本（含 PDF 切片）并返回可引用片段。
- `ImageGenerate` / `VideoGenerate` / `MusicGenerate` / `ScriptGenerate`。
- `EditCompose`: 剪辑与合成。
- `GraphOps`: 打组/连线/删除节点等画布逻辑操作。
- `MemorySearch` 与 `SPECSearch`：一期先保留接口，不默认暴露给 LLM。

### C. 关键数据对象
- `Event`: `{id, type, source, visible_to_user, payload, ts}`。
- `Message`: `{message_id, role, content, related_event_ids, ts}`。
- `WorkflowSnapshot`: 当前全局 workflow JSON（每轮可注入给模型）。
- `TaskStep`: `{step_id, tool, input, status, output, error, ts}`。

### D. 一期边界（避免过度实现）
- 只做“基础 planning + 局部 workflow 初始化”。
- 不做全自动工作流重构与复杂澄清对话策略。
- 不上 sub-agent，先做单 Agent + 复杂工具。

## 2) 执行步骤（建议顺序）

1. 定义协议与事件
- 先冻结 `event/message` schema，明确用户可见字段与模型可见字段。

2. 打通消息存储
- 每个用户输入、每个画布写操作、每次模型输出都生成独立 `message_id` 并可追踪。

3. 搭建 Agent Runtime 主链路
- 先跑通单轮：接收用户输入 -> 模型 planning -> 可选工具调用 -> 输出响应。

4. 接入 Tool Registry
- 工具统一 `name/description/schema/execute`，并加超时、重试、错误映射。

5. 接入 Model Gateway
- 统一模型接口，先支持一个主模型，保留多模型扩展位。

6. 做状态机和 Stop
- 增加 `task/step` 状态，支持 fail-fast stop、重入恢复。

7. 加可观测性与评测
- trace + 结构化日志；用固定评测集做 A/B（裸模 vs Agent）。

## 3) 你需要提供的 API 信息
- 模型 API：`base_url`、`model`、`auth`、请求体格式、返回体字段。
- 工具 API：每个工具的 `endpoint`、`method`、`headers`、`input/output schema`。
- 超时 SLA：模型超时、工具超时、重试策略。
- 鉴权方式：`Bearer Token` / AKSK / 其他签名。
