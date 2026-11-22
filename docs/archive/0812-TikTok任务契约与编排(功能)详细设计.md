# TikTok 任务契约与编排详细设计

## 1. 背景与目标

`one-autojs6` 已将 `tiktok.post` 扩展为契约版本 2，支持 `publish`、`preflight`、`recover`、`status` 四类动作，并增加 `publicationId`、素材池、文案池、频率保护及链接重试参数。当前 `node_server` 只把 `tiktok.post` 作为通用可信脚本下发，调用方必须自行构造原始 `params`，无法在服务端获得一致的契约校验、默认值和 `publicationId`。

本次在现有设备任务中心 DDD 架构上增加 TikTok 垂直切片，目标如下：

- 服务端提供受类型和领域规则约束的 TikTok v2 下发入口。
- 复用设备任务中心的设备校验、持久化、MQTT 发布、发布失败补偿、结果回调和超时扫描。
- 保持手机端为执行策略的权威来源；手机端可继续收紧账号、素材根目录、频率上限和本地账本规则。
- 不复制 AutoJS6 UI 自动化、AdbKeyboard、作品账本、链接恢复和异常恢复实现。
- 不修改数据库、MQTT v2 Topic、任务结果协议、现有四个异步任务 HTTP 接口或前端任务列表。

## 2. 范围

### 2.1 本次实现

- 新增 `/api/v1/admin/mobile/tiktok-task/v2/dispatch` POST 接口。
- 接收 Canonical TikTok contract v2，拒绝未知字段和隐式数字字符串。
- 支持服务端生成或校验 `publicationId`：
  - `publish`、`preflight` 可省略，由服务端生成 UUID。
  - `recover`、`status` 必须传入原 `publicationId`。
- 归一化文案、频控和链接重试默认值，并将任务超时从秒转换为毫秒。
- 返回设备任务标识、追踪标识、过期时间及规范化后的 `action/publicationId`。
- 复用 `admin.mobile.async_task:dispatch` 权限，避免现有角色因新增权限种子而不可用。

### 2.2 明确不实现

- 不兼容 PC 控制器的旧版扁平字段和 query 参数；旧调用仍可使用原 PC 控制器或通用异步任务接口。
- 不新增 TikTok 发布表、作品表、事件表或 Outbox。
- 不把手机端私有账本同步到服务端，也不在服务端推断发布成功或作品链接。
- 不新增发布表单、按钮或自动轮询页面；已有异步任务列表继续显示任务和最终结果。
- 不修改 `one-autojs6`，只消费其已稳定的 v2 协议。

## 3. 架构设计

### 3.1 依赖方向

```text
interfaces/http
      |
      v
application -----> domain
      ^
      |
infrastructure -----> async-task facade
```

- `domain`：定义 TikTok v2 值对象、默认值、字段白名单和纯归一化规则；通过注入的 ID 生成函数避免依赖 Node API。
- `application`：编排契约归一化与可信任务下发；只依赖 TikTok 自有端口，不依赖 Hono、Drizzle 或 `@hodor/core`。
- `infrastructure`：将 TikTok 下发端口适配到稳定的 `async-task/facade.ts`，并使用 Web Crypto 生成 UUID。
- `interfaces/http`：把应用异常映射为现有 `BusinessError`，构造 HTTPS 回调地址。
- 根 `model.ts/service.ts/index.ts`：集中 JSON Schema、纯 API 对象和路由挂载。

### 3.2 与设备任务中心的关系

TikTok 切片只负责生成一条符合 v2 规则的命令：

```text
TikTokDispatchRequest
  -> normalize contract v2
  -> dispatchTrustedTask(scriptId = "tiktok.post")
  -> admin_mobile_async_task
  -> MQTT v2 device topic
  -> one-autojs6
```

设备任务中心继续拥有以下通用能力：

- 设备存在性和启停校验。
- 任务 ID、trace ID、优先级和超时。
- 先入库后发布及 `MQTT_PUBLISH_FAILED` 补偿。
- HTTPS/MQTT 结果回调、四元组匹配、终态幂等及超时。

TikTok 切片不得直接访问 Repository、MQTT Publisher 或异步任务 HTTP `service.ts`。

## 4. HTTP 契约

### 4.1 请求

接口：`POST /api/v1/admin/mobile/tiktok-task/v2/dispatch`

服务端调度字段：

- `clientId`：目标设备标识，必填。
- `timeout`：120 至 600 秒，默认 420。
- `priority`：`LOW/NORMAL/HIGH`，可选。
- `preemptRunning`：是否抢占同级或更低优先级任务，默认 false。
- `remark`：任务备注，可选。

路径中的 `/v2/` 同时用于区分契约版本，并确保复用 `admin.mobile.async_task` 权限时，encapsulation 生成的 OpenAPI Schema 名不会与原 `/async-task/dispatch` 冲突。

手机 TikTok v2 字段：

- `contractVersion`：固定为 2。
- `action`：`publish/preflight/recover/status`。
- `publicationId`：UUID；发布和预检可省略，恢复和状态查询必填。
- `expectedHandle`：可选账号二次断言；手机本地配置仍为权威配置。
- `media`：发布必填；支持 direct 单路径或 pool 路径列表/目录。
- `content`：标题、详情及候选池。
- `policy`：最小间隔、每日上限、素材和文案复用冷却。
- `link`：作品链接重试次数和间隔。

所有对象均关闭 `additionalProperties`。服务端再次执行领域层校验，防止绕过 HTTP Schema 的内部调用。

### 4.2 响应

响应沿用 encapsulation 的统一信封，业务数据包含：

- `taskId`
- `status`，固定为 `PENDING`
- `traceId`
- `expiresAtUtc`
- `contractVersion`，固定为 2
- `action`
- `publicationId`

调用方继续使用现有 `/api/v1/admin/mobile/async-task/get` 查询结果，避免重复定义任务详情模型。

## 5. 领域规则

- 仅接受契约版本 2 和四个已知动作。
- `publicationId` 使用 UUID；服务端生成时使用 Web Crypto。
- `expectedHandle` 去除前导 `@` 后必须满足 2 至 24 位安全字符，禁止尾随点和连续点。
- Android 媒体路径必须为安全绝对路径，不含 `..`，长度不超过 1024。
- direct 只允许 `image/video + path`；pool 只允许 `paths` 或 `directory` 二选一，kind 可为 `auto`。
- 候选路径、标题和详情池最多各 20 项。
- 标题不超过 90 个 UTF-16 单元，详情不超过 4000；视频组合文案不超过 2200。
- 策略和链接重试参数使用 `one-autojs6` PC 契约的范围与默认值。
- 服务端参数是请求约束，手机端策略只可进一步收紧，不可被请求放宽。

## 6. 兼容性与数据影响

- 原 `/mobile/async-task/list|dispatch|get|callback` 路径、Schema 和行为不变。
- `tiktok.post` 的 `scriptId`、`scriptVersion=1`、MQTT protocolVersion=2 不变。
- 新入口最终仍写入现有 `admin_mobile_async_task.params_json/result_data_json`。
- 无数据库 DDL、D1 Migration、权限/菜单/翻译种子和 OpenAPI 前端生成文件变更。
- 通用异步任务接口仍可下发原始 `tiktok.post` 参数，以免破坏既有集成；新入口是推荐的严格 v2 通道。

## 7. 验证策略

- 领域单测：默认值、四类动作、UUID、未知字段、素材模式、路径、文案、策略、链接和超时边界。
- 应用单测：服务端生成 publicationId、恢复复用 ID、秒到毫秒转换、调度字段透传和端口异常传播。
- HTTP 契约测试：默认导出只含 `dispatch`，POST 路径、权限、封闭字段、嵌套 Schema 和响应必填字段。
- 回归：原 async-task 定向测试、服务端 TypeScript 诊断、服务端构建、变更文件 ESLint/Prettier、`git diff --check`、LF/UTF-8、无新增 `any/as any`。

## 8. 后续阶段

- 根据真实运营流程新增独立管理页，使用生成的 OpenAPI 类型构建预检、发布、补链和状态查询表单。
- 若需要跨设备或跨账号的中心化发布审计，再设计服务端 publication 聚合与 Outbox；不得直接用任务表替代作品事实表。
- 生产发布后先下发 `preflight`，验证账号、网络、输入法和素材权限，再进行真实 `publish`。
