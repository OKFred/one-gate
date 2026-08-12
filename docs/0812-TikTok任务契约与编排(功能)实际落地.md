# TikTok 任务契约与编排实际落地

## 1. 落地结论

已在 `node_server` 的设备任务中心之上新增 TikTok contract v2 垂直切片，支持 `publish`、`preflight`、`recover`、`status` 四类任务。服务端负责严格契约、默认值、`publicationId` 和任务编排；`one-autojs6` 继续负责账号、网络、素材、频控、账本、输入法和 UI 自动化执行。

新接口为：

- `POST /api/v1/admin/mobile/tiktok-task/v2/dispatch`

任务结果继续通过现有接口查询：

- `POST /api/v1/admin/mobile/async-task/get`

## 2. 实际改动

### 2.1 Domain

新增 `mobile/tiktok-task/domain/contract.ts`：

- 从同一常量导出动作、媒体类型和值域类型，供领域与 HTTP Schema 复用。
- 只接受 canonical contract v2，拒绝未知字段和隐式数字字符串。
- `publish/preflight` 可生成 UUID；`recover/status` 必须复用原 UUID。
- 校验账号断言、安全 Android 路径、direct/pool 互斥、候选池数量、文案长度、视频组合文案、频控、链接重试和超时。
- 填充与 `one-autojs6` PC 契约一致的默认策略。

### 2.2 Application

新增 TikTok 应用服务和端口：

- 应用层只依赖自己的 Dispatcher、Actor 和 ID Generator 端口。
- 将 `timeout` 秒转换为设备任务中心的毫秒。
- 固定使用可信脚本 `tiktok.post`，并将规范化后的 `publicationId` 同时返回给调用方。
- 契约错误映射为 `TikTokTaskApplicationError`，MQTT/数据库等非业务异常继续向外传播。

### 2.3 Infrastructure 与 façade

- 默认容器使用 Web Crypto `randomUUID()`，兼容 Node 和 Cloudflare Workers。
- 通过稳定的 `async-task/facade.ts` 调用 `dispatchTrustedTask`，未直接依赖 Repository、Publisher 或 HTTP service。
- 设备不存在、停用和可信任务规则异常由 infrastructure 转换为 TikTok 应用异常。
- `async-task` façade 额外公开 `DeviceTaskApplicationError`，不改变既有用例和 HTTP 行为。

### 2.4 HTTP 与路由

- 新增集中 JSON Schema、纯 `dispatch` API 对象、HTTP 错误映射和独立路由入口。
- 路由挂载为 `/mobile/tiktok-task/v2/dispatch`。
- 复用 `admin.mobile.async_task:dispatch` 权限，因此无需新增角色权限、菜单和翻译种子。
- `/v2/dispatch` 子路径保证 encapsulation 生成的 Schema 名与原 `/async-task/dispatch` 不冲突。

### 2.5 测试

新增：

- `domain/contract.spec.ts`：11 项领域测试。
- `application/task-center.spec.ts`：4 项 Fake Ports 应用测试。
- `service.spec.ts`：4 项 HTTP API 和 Schema 测试。

并回归原 async-task 的 54 项领域、应用和 HTTP 测试。

## 3. 与计划的差异

### 3.1 调整项

- 初始设计曾使用 `/mobile/tiktok-task/dispatch`。复盘发现新模块复用 `admin.mobile.async_task` 业务键时会与原 `/async-task/dispatch` 生成同名 OpenAPI Schema，因此最终路径改为 `/mobile/tiktok-task/v2/dispatch`，并同步更新详细设计和计划文档。
- 计划中 `async-task` façade 的异常导出为“如适配器需要”；实际需要该导出，以阻止 TikTok HTTP 层直接依赖另一个切片的 HTTP 错误适配器。

### 3.2 未实现项

- 未复制 PC 控制器的旧版扁平/query 兼容层；新入口只接受 v2。
- 未新增前端发布页面；当前仍由异步任务列表查看任务和结果。
- 未执行真实 TikTok 发布、补链或状态查询。
- 未修改 `one-autojs6`。

## 4. 验证结果

### 4.1 类型、测试和构建

- 修改前 Windows TypeScript 诊断：通过。
- 修改后 Windows TypeScript 诊断：通过，无新增错误。
- Vitest：7 个文件、73 项测试全部通过。
- 服务端完整构建：通过，`tsgo` 与 `tsc-alias` 成功。
- 变更 TypeScript 文件 ESLint `--fix`：通过。
- 变更 TypeScript/Markdown 文件 Prettier：通过。

WSL 中首次执行 TypeScript 诊断时，pnpm 检测到当前 `node_modules` 为 Windows 平台依赖并拒绝无 TTY 的重装。按既定双环境策略未改动依赖，后续全部使用 Windows Node/pnpm 完成验证。

### 4.2 兼容性

- 原 async-task 的 `list/dispatch/get/callback` API 对象和路径未修改。
- `tiktok.post` 仍使用 `scriptVersion=1`，与当前 `one-autojs6` task registry 一致。
- MQTT protocolVersion、Topic、载荷、先入库后发布、失败补偿和结果回调均复用原实现。
- `one-autojs6` 工作区保持干净。
- 无 Drizzle、DDL、D1 Migration、Worker binding、secret、权限种子、菜单和 OpenAPI 前端生成文件变更。

### 4.3 生产验证边界

Chrome CDP 只读连接重试成功，生产设备页显示 `mobile_35249311637582` 在线，客户端版本 `2.0.0`、Android 13，页面最后心跳为 `2026-08-12 20:14:52`。

随后通过当前生产异步任务接口下发一次不操作手机 UI 的 `device.apps.list`：

- `taskId`：`eb12aad4-5695-4a82-bd79-787d51ef813b`
- 状态：`PENDING -> SUCCESS`
- 结果码：`OK`
- 结果消息：`Script execution succeeded`
- 手机执行区间：`1786536942001 -> 1786536943324`

该结果确认现有生产 Worker、D1 任务写入、EMQX 发布与鉴权、设备订阅执行及结果回传链路正常。当前新增的 TikTok 专用接口尚未提交部署，因此本轮没有下发真实 `preflight`、`publish`、`recover` 或 `status`；部署后仍应先从新接口下发 `preflight`，确认成功后再进入真实发布。

## 5. 复盘记录

本次共执行三轮复盘：

1. 发现 TikTok HTTP 层横向依赖 async-task HTTP 错误适配器，改为 façade 异常导出与 infrastructure 映射。
2. 发现复用业务键会造成 `/dispatch` OpenAPI Schema 名冲突，改为显式 `/v2/dispatch`。
3. 最终复核依赖方向、API Schema、Worker/Node 兼容、无 `any/as any`、文本格式和 Git diff，未发现新的阻断问题。

## 6. 后续建议

1. 合并部署后先调用 `preflight`，不要直接发布；保留返回的 `publicationId` 和 `taskId`。
2. 通过 `/async-task/get` 等待终态，只有手机明确返回成功才视为预检通过。
3. 实际发布必须使用新的 `publicationId`；结果未知时先 `status`，确需补链时再 `recover`，不要重复 `publish`。
4. 后续新增前端页面时复用生成 OpenAPI 类型，并把发布表单、任务状态和作品事实分开建模。
5. 如果未来需要跨账号中心化审计，再单独设计 publication 聚合和 Outbox；本轮任务表不承担作品事实来源。
