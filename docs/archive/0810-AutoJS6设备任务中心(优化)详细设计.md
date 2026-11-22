# AutoJS6 设备任务中心详细设计

## 1. 背景与目标

当前 AutoJS6 自动化能力分散在 PC、Node Server 与手机 Termux 三处，Node Server 仍可向手机下发任意 JavaScript/Shell。任务超时、状态回传和事件监听也分别实现，难以审计，且不利于后续多设备管理。

本次目标：

1. 手机端保存并管理可信 AutoJS6 脚本，服务端仅下发脚本标识与结构化参数，关闭远程代码执行入口。
2. 建立统一的 v2 任务请求、执行结果、超时与 MQTT Topic 规范。
3. 将电量、网络、短信、通知监听改为 `autojs6-config.json` 配置驱动。
4. 以 `deviceId` 为一等字段，为多设备并行、设备能力上报和设备隔离预留边界。
5. 将 Node Server 已有的应用同步/安装流程迁移到同一任务中心，并提供 TikTok 发布等脚本的通用调度入口。

## 2. 安全边界

### 2.1 可信脚本注册表

手机端维护静态注册表，每项包含：

- `scriptId`：稳定且可审计的标识，如 `device.apps.list`、`app.install`、`tiktok.post`。
- `fileName`：随手机客户端部署的脚本文件。
- `defaultTimeoutMs` 与 `maxTimeoutMs`：脚本级超时边界。
- `version`：脚本协议版本，随设备能力上报。

服务端只能下发注册表中的 `scriptId` 和 JSON 参数。手机会先校验协议版本、设备标识、有效期、脚本白名单及参数大小，再从本地读取脚本。服务端不能传入文件路径，也不能覆盖脚本正文。

### 2.2 旧协议兼容

v2 手机客户端不实现远程 JavaScript/Shell，也不订阅旧公共任务 Topic。这一能力不能通过远程配置或本地开关重新打开。旧 HTTP 回调只保留在 Node Server 中，用于仍未升级的旧设备过渡。

### 2.3 参数注入

参数通过 `JSON.stringify` 后注入固定占位符 `__AUTOJS_TASK_PARAMS__`，任务 ID、结果文件路径等运行时变量同样使用 JSON 字面量生成，避免字符串拼接导致脚本逃逸。

## 3. v2 协议

### 3.1 下发任务

Topic：`autojs6/v2/devices/{deviceId}/tasks`

```json
{
  "protocolVersion": 2,
  "taskId": "uuid",
  "deviceId": "phone-001",
  "scriptId": "tiktok.post",
  "scriptVersion": 1,
  "params": {},
  "timeoutMs": 300000,
  "createdAt": 1786291200000,
  "expiresAt": 1786291500000,
  "traceId": "uuid",
  "callbackUrl": "https://api.example.com/api/v1/admin/mobile/async-task/callback"
}
```

服务端创建数据库记录后异步发布，HTTP API 立即返回 `taskId`、`status=PENDING`，调用方通过任务详情接口轮询。

### 3.2 统一结果

Topic：`autojs6/v2/devices/{deviceId}/results`

```json
{
  "protocolVersion": 2,
  "taskId": "uuid",
  "deviceId": "phone-001",
  "scriptId": "tiktok.post",
  "status": "SUCCESS",
  "code": "OK",
  "message": "发布完成",
  "data": {},
  "startedAt": 1786291201000,
  "finishedAt": 1786291231000,
  "durationMs": 30000,
  "traceId": "uuid"
}
```

终态为 `SUCCESS | FAILURE | TIMEOUT | REJECTED | CANCELLED`。`TIMEOUT` 是独立状态，不再伪装成普通失败。服务端按 `taskId + deviceId` 幂等更新，只允许 `PENDING/RUNNING` 进入终态。

### 3.3 事件与在线状态

- 事件 Topic：`autojs6/v2/devices/{deviceId}/events`
- 在线/能力 Topic：`autojs6/v2/devices/{deviceId}/presence`

Presence 使用 retained 消息，包含客户端版本、协议版本、脚本及版本列表。设备使用 MQTT Will 上报离线。首版服务端监听事件、结果与 Presence；设备表扩展可在后续版本单独完成，避免一次性改变现有设备领域模型。

## 4. 手机端配置

默认读取项目根目录 `autojs6-config.json`，可用 `AUTOJS6_CONFIG_PATH` 指定其他路径。配置分为：

- `deviceId`：默认回退到 MQTT 用户名。
- `mqtt`：QoS、会话有效期。
- `security`：允许的本地脚本列表、最大参数字节数。
- `tasks`：默认/最大超时、队列上限、结果轮询间隔。
- `events`：电量、网络、短信、通知的启用状态和防抖时间；通知可配置包名白名单/黑名单。

配置只决定是否启动本地已知监听器，不接受远程 JavaScript 片段。

## 5. 超时与生命周期

1. 服务端在创建任务时计算 `expiresAtUtc`，设备收到已过期任务直接回 `TIMEOUT/TASK_EXPIRED`。
2. 手机将请求超时限制在脚本默认值、脚本最大值与设备全局最大值之间。
3. 手机超时后终止 AutoJS6 进程，清理临时脚本和结果文件，回传 `TIMEOUT/TASK_TIMEOUT`。
4. 服务端后台扫描过期的 `PENDING/RUNNING` 任务，写入 `TIMEOUT/SERVER_TIMEOUT`。
5. 晚到结果不会覆盖已经落库的终态。

## 6. Node Server 数据模型

`admin_mobile_async_task` 从原始脚本存储迁移为任务协议存储：

- 保留：`task_id`、`client_id`、状态、结果消息、过期时间和审计字段。
- 兼容保留：`cat`、`script`，新任务分别写入 `autojs6-v2` 与 `scriptId`，不再保存源码。
- 新增：`protocol_version`、`script_id`、`script_version`、`params_json`、`timeout_ms`、`trace_id`、`result_code`、`result_data_json`、`started_at_utc`、`finished_at_utc`。

DDL 使用可重复执行的 `ALTER TABLE ... ADD COLUMN` 迁移策略；新建库的主建表语句同步更新。

## 7. 服务划分

- `mobile/async-task`：统一任务创建、发布、查询、结果落库、超时扫描。
- `mobile/device-app`：仅负责应用领域编排，调用任务中心下发 `device.apps.list`、`app.install`。
- `mqtt/listener`：一条长连接订阅 v1 事件兼容 Topic 与 v2 event/result/presence Topic；结果转交任务中心。
- 手机 `task-registry`：脚本白名单、版本和超时元数据。
- 手机 `client`：协议校验、队列、执行器、统一结果和 Presence。

## 8. TikTok 与素材参数

TikTok 脚本注册为 `tiktok.post`。服务端通用 dispatch 接口可传递素材路径/目录、图片与视频候选池、标题池、详情池、发布间隔和每日上限。脚本仍在手机本地执行，标题与详细描述由固定脚本中的参数化逻辑选择，不需要服务端下发 JS。

## 9. 可观测性与后续演进

- 首版日志统一携带 `taskId/deviceId/scriptId/traceId`。
- 下一阶段可增加设备心跳持久化、任务取消 Topic、并发策略、脚本包签名与灰度版本。
- 若未来需要动态更新脚本，应采用签名脚本包、版本清单和人工审批，不恢复任意源码下发。

## 10. Node.js 与 Cloudflare Worker 运行时分层

共享层只包含 HTTP API、D1/SQLite 仓库、任务协议、短连接 MQTT over WSS 发布和结果落库。运行时入口按能力拆分：

- Node.js：启动长期 MQTT Listener，并用 `setInterval` 扫描超时任务。
- Worker：不导入 Node `events` 或 MQTT Listener；手机通过同一 v2 结果结构 POST 到回调 API，Worker `scheduled` 事件扫描超时任务。
- 手机：始终发布 MQTT 结果；任务包含 callbackUrl 时额外发送一次 HTTP 结果。两条路径由服务端终态幂等保证，任一先到都不会被另一条覆盖。

HTTP 回调不依赖用户登录态，但必须与已存在任务的 `taskId + deviceId + scriptId + traceId` 完全一致；路由使用精确白名单匹配，消息字段有长度约束，完整结果体最大 1 MiB。

普通 Worker 是无状态请求处理环境，不应把长期 MQTT 连接保存在模块全局。未来如需 Worker 主动长期订阅 Broker，应单独使用 Durable Object 承载 WebSocket 连接，而不是放进普通 Worker fetch 实例。

参考：Cloudflare 官方 [Durable Objects WebSocket 指南](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) 与 [Durable Objects 使用规则](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)。

## 11. PC 兼容层

PC 不再读取 `pc/src/scripts` 并直接发 MQTT，而是作为 Node Server API 客户端：

1. 专用服务把 PC 请求映射为 `scriptId + params + timeoutMs`。
2. 任务状态与列表从 Node Server 查询，不再以内存 TaskService 为事实来源。
3. 通用 `/api/tasks` 只接受可信 scriptId，拒绝 `script`、Shell、kill 与远程监听器源码。
4. 旧脚本文件仅在迁移期保留为对照，不再被控制器读取；迁移完成后可删除。
5. PC 在收到请求时读取 `NODE_SERVER_BASE_URL`、令牌与默认设备 ID，避免模块导入早于 dotenv 初始化导致缓存空配置。
