# AutoJS6 短期设备运维 WSS V1 落地说明

## 边界

- MQTT v2 继续承担日常可信脚本任务，部署仍使用独立 deploy/v1 主题。
- ops/v1 MQTT 主题只唤醒设备建立短期 WSS，不携带票据或设备 Token。
- 一台设备同时最多一个运维会话；每个会话对应一个 `MobileOpsSession` Durable Object。
- V1 不提供 Shell、JavaScript、PTY、ttyd、文件内容读取或下载。

## 连接流程

1. 管理员调用 `POST /api/v1/admin/mobile/device-ops/session/open`。
2. Node Server 创建 D1 会话、初始化 Durable Object，并生成一次性操作员票据。
3. 专用 MQTT 发布器只记录会话元数据，发送不含凭据的 `OPEN_SESSION`。
4. 手机以现有设备上报 Token 作为 `Authorization: Device ...` 主动连接 WSS。
5. 浏览器以 `autojs6-ops-v1` 和 `ticket.<base64url>` 子协议连接；票据验证后立即失效。
6. Durable Object 只转发固定 RPC 帧，并将完整请求和响应用 `MOBILE_SENSITIVE_DATA_KEY`
   加密后写入 D1。

生产浏览器 Origin 固定为三个 Gate 域名。WSS Upgrade 是唯一 GET 例外，其他管理接口全部采用
POST 和既有统一响应信封。

## 数据与保留

- `admin_mobile_device_ops_session` 保存会话生命周期，不保存明文票据。
- `admin_mobile_device_ops_audit` 保存非敏感索引和 AES-GCM 密文。
- AAD 为 `mobile-ops:{sessionId}:{requestId}:{request|response}`。
- Scheduled handler 每分钟结束过期会话，并删除超过 30 天的加密审计。
- 历史完整内容只允许超级管理员 Reveal，Reveal 本身进入业务审计。

## 本地与上线

- 普通 Node 开发服务可生成和展示管理 API，但实时会话必须使用 `pnpm worker:dev`。
- 修改 `wrangler.jsonc` 后运行 `pnpm worker:types`。
- 本地先执行 D1 migration 和 schema contract，再运行 Worker Vitest、服务端构建和管理端构建。
- 上线时先应用远端 D1 migration，再部署包含 Durable Object migration 的 Worker；手机端通过
  `ops.enabled` 金丝雀开启。
