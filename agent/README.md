# Simple Agent 使用说明

## 1. 先跑 mock（无需 API）
```bash
node agent/simple-agent.js
```

## 2. 接入真实 API
1. 复制环境变量模板
```bash
cp agent/.env.example agent/.env
```
2. 在 `agent/.env` 填写真实参数（不要提交到 git）
3. 运行
```bash
set -a; source agent/.env; set +a; node agent/simple-agent.js
```

## 3. 配置 Liblib 图1模型
将以下变量填入 `agent/.env`：
- `USE_LIBLIB_TOOLS=1`
- `LIBLIB_BASE_URL=https://openapi.liblibai.cloud`
- `LIBLIB_ACCESS_KEY=...`
- `LIBLIB_SECRET_KEY=...`

已内置工具（图1对应）：
- `LiblibF1KontextText2Img`
- `LiblibF1KontextImg2Img`
- `LiblibLibDreamText2Img`
- `LiblibLibEdit`
- `LiblibSeedream40`
- `LiblibSeedream45`
- `LiblibKling25Text2Video`
- `LiblibKling26Text2Video`
- `LiblibKlingImg2Video`
- `LiblibQueryGenerateStatus`

模型映射：
- Seedream 4.0 -> `doubao-seedream-4-0-250828`
- Seedream 4.5 -> `doubao-seedream-4-5-251128`
- Kling 2.5 -> `kling-v2-5-turbo`
- Kling 2.6 -> `kling-v2-6`

鉴权方式：
- 每次请求自动追加 `AccessKey/Signature/Timestamp/SignatureNonce`
- `Signature` 使用 `HMAC-SHA1(uri&timestamp&nonce)` + URL-safe Base64（去掉 `=`）

## 4. 认证模式
- `bearer`: 使用 `Authorization: Bearer <token>`
- `aksk`: 使用两个 header（默认 `X-Access-Key` / `X-Secret-Key`）
- `none`: 不带认证头

## 5. 当前能力
- Agent 主链路：`planning -> tool call -> finish`
- 工具：支持 `FileSearch`（可用真实 HTTP 接口或本地 mock）
- 工具：支持 Liblib 图1模型调用（文生图/图生图/文生视频/图生视频/状态查询）
- 模型：支持 OpenAI-compatible chat completions 接口

## 6. 你还需要提供（若要我继续接完整）
- 模型 API 的精确请求/返回字段（若与 OpenAI 不同）
- FileSearch API 的请求/返回 schema
- 后续工具（视频/脚本/音乐/编辑/画布操作）的 endpoint 与 schema
