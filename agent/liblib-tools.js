const crypto = require("node:crypto");

const LIBLIB_DEFAULT_BASE_URL = "https://openapi.liblibai.cloud";

const LIBLIB_TEMPLATE_UUIDS = Object.freeze({
  f1KontextText2Img: "fe9928fde1b4491c9b360dd24aa2b115",
  f1KontextImg2Img: "1c0a9712b3d84e1b8a9f49514a46d88c",
  libDream: "aa835a39c1a14cfca47c6fc941137c51",
  libEdit: "cd3a6751086b4483ba5f0523aef53a79",
  seedreamV4: "0b6bad2fd350433ebb5abc7eb91f2ec9",
  klingText2Video: "61cd8b60d340404394f2a545eeaf197a",
  klingImg2Video: "180f33c6748041b48593030156d2a71d",
});

const SEEDREAM_MODEL_ID = Object.freeze({
  seedream40: "doubao-seedream-4-0-250828",
  seedream45: "doubao-seedream-4-5-251128",
});

const KLING_MODEL_ID = Object.freeze({
  kling25: "kling-v2-5-turbo",
  kling26: "kling-v2-6",
});

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function toBase64UrlNoPadding(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeSignature({ uri, secretKey, timestamp, signatureNonce }) {
  const content = `${uri}&${timestamp}&${signatureNonce}`;
  const digest = crypto.createHmac("sha1", secretKey).update(content).digest();
  return toBase64UrlNoPadding(digest);
}

function buildSignedPath({ uri, accessKey, secretKey }) {
  const timestamp = String(Date.now());
  const signatureNonce = crypto.randomUUID().replace(/-/g, "");
  const signature = makeSignature({
    uri,
    secretKey,
    timestamp,
    signatureNonce,
  });
  const qs = new URLSearchParams({
    AccessKey: accessKey,
    Signature: signature,
    Timestamp: timestamp,
    SignatureNonce: signatureNonce,
  });
  return `${uri}?${qs.toString()}`;
}

function normalizeBaseUrl(url) {
  return (url || LIBLIB_DEFAULT_BASE_URL).replace(/\/+$/g, "");
}

function stripUndefined(input) {
  const out = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function createLiblibClientFromEnv() {
  return {
    baseUrl: normalizeBaseUrl(process.env.LIBLIB_BASE_URL),
    accessKey: assertEnv("LIBLIB_ACCESS_KEY"),
    secretKey: assertEnv("LIBLIB_SECRET_KEY"),
  };
}

async function liblibPostJson(client, uri, body) {
  const signedPath = buildSignedPath({
    uri,
    accessKey: client.accessKey,
    secretKey: client.secretKey,
  });
  const res = await fetch(`${client.baseUrl}${signedPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Liblib API ${uri} HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  if (typeof data?.code !== "undefined" && data.code !== 0) {
    throw new Error(`Liblib API ${uri} code=${data.code} msg=${data.msg || ""}`);
  }
  return data;
}

function createLiblibToolsFromEnv() {
  const client = createLiblibClientFromEnv();

  const f1KontextText2Img = {
    name: "LiblibF1KontextText2Img",
    description:
      "F.1 Kontext 文生图。支持 model=pro|max，默认 max。返回 generateUuid。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        model: { type: "string", enum: ["pro", "max"] },
        aspectRatio: { type: "string" },
        guidance_scale: { type: "number" },
        imgCount: { type: "integer" },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.f1KontextText2Img,
        generateParams: stripUndefined({
          model: input.model || "max",
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          guidance_scale: input.guidance_scale,
          imgCount: input.imgCount,
        }),
      };
      return liblibPostJson(client, "/api/generate/kontext/text2img", body);
    },
  };

  const f1KontextImg2Img = {
    name: "LiblibF1KontextImg2Img",
    description:
      "F.1 Kontext 图生图（指令编辑/多图参考）。image_list 为图片 URL 数组。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        image_list: { type: "array", items: { type: "string" } },
        model: { type: "string", enum: ["pro", "max"] },
        aspectRatio: { type: "string" },
        guidance_scale: { type: "number" },
        imgCount: { type: "integer" },
      },
      required: ["prompt", "image_list"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.f1KontextImg2Img,
        generateParams: stripUndefined({
          model: input.model || "max",
          prompt: input.prompt,
          image_list: input.image_list,
          aspectRatio: input.aspectRatio,
          guidance_scale: input.guidance_scale,
          imgCount: input.imgCount,
        }),
      };
      return liblibPostJson(client, "/api/generate/kontext/img2img", body);
    },
  };

  const libDreamText2Img = {
    name: "LiblibLibDreamText2Img",
    description: "libDream 文生图。返回 generateUuid。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        usePreLlm: { type: "boolean" },
        width: { type: "integer" },
        height: { type: "integer" },
        scale: { type: "number" },
        seed: { type: "integer" },
        imgCount: { type: "integer" },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.libDream,
        generateParams: stripUndefined({
          prompt: input.prompt,
          usePreLlm: input.usePreLlm,
          width: input.width,
          height: input.height,
          scale: input.scale,
          seed: input.seed,
          imgCount: input.imgCount,
        }),
      };
      return liblibPostJson(client, "/api/generate/libDream", body);
    },
  };

  const libEdit = {
    name: "LiblibLibEdit",
    description:
      "libEdit 指令编辑。输入 prompt + image_urls（单图 URL 数组）。返回 generateUuid。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        image_urls: { type: "array", items: { type: "string" } },
        promptMagic: { type: "integer" },
        scale: { type: "number" },
        seed: { type: "integer" },
        imgCount: { type: "integer" },
      },
      required: ["prompt", "image_urls"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.libEdit,
        generateParams: stripUndefined({
          prompt: input.prompt,
          image_urls: input.image_urls,
          promptMagic: input.promptMagic,
          scale: input.scale,
          seed: input.seed,
          imgCount: input.imgCount,
        }),
      };
      return liblibPostJson(client, "/api/generate/libEdit", body);
    },
  };

  const seedream40 = {
    name: "LiblibSeedream40",
    description:
      "Seedream 4.0 生图（/api/generate/seedreamV4，model=doubao-seedream-4-0-250828）。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        width: { type: "integer" },
        height: { type: "integer" },
        imgCount: { type: "integer" },
        promptMagic: { type: "integer" },
        sequentialImageGeneration: { type: "string", enum: ["disabled", "auto"] },
        referenceImages: { type: "array", items: { type: "string" } },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.seedreamV4,
        generateParams: stripUndefined({
          model: SEEDREAM_MODEL_ID.seedream40,
          prompt: input.prompt,
          width: input.width,
          height: input.height,
          imgCount: input.imgCount,
          promptMagic: input.promptMagic,
          sequentialImageGeneration: input.sequentialImageGeneration,
          referenceImages: input.referenceImages,
        }),
      };
      return liblibPostJson(client, "/api/generate/seedreamV4", body);
    },
  };

  const seedream45 = {
    name: "LiblibSeedream45",
    description:
      "Seedream 4.5 生图（/api/generate/seedreamV4，model=doubao-seedream-4-5-251128）。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        width: { type: "integer" },
        height: { type: "integer" },
        imgCount: { type: "integer" },
        promptMagic: { type: "integer" },
        sequentialImageGeneration: { type: "string", enum: ["disabled", "auto"] },
        referenceImages: { type: "array", items: { type: "string" } },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.seedreamV4,
        generateParams: stripUndefined({
          model: SEEDREAM_MODEL_ID.seedream45,
          prompt: input.prompt,
          width: input.width,
          height: input.height,
          imgCount: input.imgCount,
          promptMagic: input.promptMagic,
          sequentialImageGeneration: input.sequentialImageGeneration,
          referenceImages: input.referenceImages,
        }),
      };
      return liblibPostJson(client, "/api/generate/seedreamV4", body);
    },
  };

  const kling25Text2Video = {
    name: "LiblibKling25Text2Video",
    description:
      "Kling 2.5 文生视频（model=kling-v2-5-turbo，mode 需为 pro）。返回 generateUuid。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        promptMagic: { type: "integer" },
        aspectRatio: { type: "string" },
        duration: { type: "string" },
        mode: { type: "string", enum: ["pro"] },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.klingText2Video,
        generateParams: stripUndefined({
          model: KLING_MODEL_ID.kling25,
          prompt: input.prompt,
          promptMagic: input.promptMagic,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          mode: "pro",
        }),
      };
      return liblibPostJson(client, "/api/generate/video/kling/text2video", body);
    },
  };

  const kling26Text2Video = {
    name: "LiblibKling26Text2Video",
    description:
      "Kling 2.6 文生视频（model=kling-v2-6）。支持 sound=on/off。返回 generateUuid。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        promptMagic: { type: "integer" },
        aspectRatio: { type: "string" },
        duration: { type: "string" },
        mode: { type: "string", enum: ["std", "pro"] },
        sound: { type: "string", enum: ["on", "off"] },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.klingText2Video,
        generateParams: stripUndefined({
          model: KLING_MODEL_ID.kling26,
          prompt: input.prompt,
          promptMagic: input.promptMagic,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
          mode: input.mode,
          sound: input.sound,
        }),
      };
      return liblibPostJson(client, "/api/generate/video/kling/text2video", body);
    },
  };

  const klingImg2Video = {
    name: "LiblibKlingImg2Video",
    description:
      "可灵图生视频（支持 kling-v2-5-turbo / kling-v2-6）。v2.6 推荐传 images。",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", enum: ["kling-v2-5-turbo", "kling-v2-6"] },
        prompt: { type: "string" },
        promptMagic: { type: "integer" },
        duration: { type: "string" },
        mode: { type: "string", enum: ["std", "pro"] },
        sound: { type: "string", enum: ["on", "off"] },
        images: { type: "array", items: { type: "string" } },
        startFrame: { type: "string" },
        endFrame: { type: "string" },
      },
      required: ["model", "prompt"],
    },
    execute: async (input) => {
      if (input.model === KLING_MODEL_ID.kling25) {
        if ((input.mode || "pro") !== "pro") {
          throw new Error("kling-v2-5-turbo requires mode=pro");
        }
      }
      if (input.endFrame && (input.mode || "std") !== "pro") {
        throw new Error("endFrame requests require mode=pro");
      }
      const body = {
        templateUuid: LIBLIB_TEMPLATE_UUIDS.klingImg2Video,
        generateParams: stripUndefined({
          model: input.model,
          prompt: input.prompt,
          promptMagic: input.promptMagic,
          duration: input.duration,
          mode: input.mode,
          sound: input.sound,
          images: input.images,
          startFrame: input.startFrame,
          endFrame: input.endFrame,
        }),
      };
      return liblibPostJson(client, "/api/generate/video/kling/img2video", body);
    },
  };

  const queryStatus = {
    name: "LiblibQueryGenerateStatus",
    description: "查询生成任务状态（/api/generate/status）。",
    inputSchema: {
      type: "object",
      properties: {
        generateUuid: { type: "string" },
      },
      required: ["generateUuid"],
    },
    execute: async (input) => {
      return liblibPostJson(client, "/api/generate/status", {
        generateUuid: input.generateUuid,
      });
    },
  };

  return [
    f1KontextText2Img,
    f1KontextImg2Img,
    libDreamText2Img,
    libEdit,
    seedream40,
    seedream45,
    kling25Text2Video,
    kling26Text2Video,
    klingImg2Video,
    queryStatus,
  ];
}

module.exports = {
  createLiblibToolsFromEnv,
  createLiblibClientFromEnv,
  liblibPostJson,
  makeSignature,
  buildSignedPath,
  LIBLIB_TEMPLATE_UUIDS,
  SEEDREAM_MODEL_ID,
  KLING_MODEL_ID,
};
