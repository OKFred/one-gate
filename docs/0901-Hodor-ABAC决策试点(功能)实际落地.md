# Hodor ABAC 决策试点实际落地

## 当前状态

状态：DDD 垂直切片、append-only migration、one production 授权资源、Hodor production 数据库配置、
`dev` 合并部署和真实决策验收均已完成。

现有 Hodor RBAC 仍是业务授权事实源。ABAC 管理试点与设备详情 Shadow 已可用，但没有把任何业务
接口切换为 ABAC enforce。

## 实际完成范围

### Authorization bounded context

- 新增 `admin.system.authorization`，按 domain、application、infrastructure、interfaces/http 分层。
- 领域层负责 URL、Client ID/Secret、Cedar 输入、保留 context 和状态转换；应用层通过 Repository、
  Cipher、Gateway、Clock 端口编排，不依赖 Hono、Drizzle 或 Cloudflare。
- 基础设施实现 Drizzle Repository、AES-256-GCM 凭证适配器及 one OIDC/one-authz Gateway；HTTP 层
  保持纯 API 对象并通过独立入口挂载。
- 稳定 facade 供业务切片调用，设备模块不直接引用 Repository、Gateway 或 HTTP service。

### 数据、凭证与管理接口

- 无外键表 `system_authorization_connection` 保存 issuer、authorization base URL、audience、Client
  ID、加密 Client Secret、可选 Access 服务凭据、状态、配置版本和探测结果。
- D1 migrations `0011_authorization_connection_configuration.sql`、
  `0012_authorization_access_credentials.sql` 及对应 Node migrations 已应用；Schema Contract 验证无
  外键。
- one Client Secret 与可选 Access Secret 都使用 `HODOR_AUTH_MASTER_KEY`，并采用不同记录级 AAD；
  API 只返回 Client ID 和 `hasSecret` 布尔值。
- 管理与试决策接口已部署：
  - `/api/v1/admin/system/authorization/config/get`
  - `/api/v1/admin/system/authorization/config/save`
  - `/api/v1/admin/system/authorization/config/test`
  - `/api/v1/admin/system/authorization/config/disable`
  - `/api/v1/admin/system/authorization/pilot/check`
- 接口继续要求 Hodor Token、TOTP 和超级管理员；配置写入使用 `expectedVersion`，只有 `ready` 连接
  可以发起决策。

### one 授权网关

- 严格验证 discovery issuer、同源 token endpoint、Client Credentials scope 与 audience。
- readiness 和 decision 使用合并部署地址；fetch 设置 10 秒超时与 `redirect: manual`，3xx 和协议
  异常失败关闭。
- 出站日志只包含 requestId、operation、host、path、status、duration 和 outcome，不记录 Header、
  Token、Secret、正文、资源 ID 或属性值。
- 当前 principal 是 Hodor confidential Client；Hodor 用户信息只以服务端可信 `hodorActor` context
  传入，没有伪造 one 用户主体。

## 生产落地

- PR #96 已合入 `dev`，merge commit 为 `9ca74569b63f49832cc19c2c0e2e4dcccdd4d31a`；对应完整 CI 与
  部署 run `33898611906` 成功。
- Hodor remote D1 migration ledger 已包含 `0011`、`0012`；
  `system_authorization_connection` 无外键。
- one production 已创建 Hodor 专用 confidential Client Credentials Client、Authorization
  application、不可变 Schema 与 Cedar Policy revision。
- Hodor 生产配置为 `ready`、`config_version=5` 且探测成功，不使用 Cloudflare Access 服务凭据。
- 正常激活 revision 为 2；用于可控 mismatch 的 revision 3 已校验但保持 inactive。

## 验证结果

- 本地 domain/application/infrastructure/repository/HTTP、migration 与部署契约测试通过；Server
  TypeScript build 和 Wrangler dry-run 通过。
- 生产真实登录完成 Identity Center + TOTP 后，配置读取、Client Credentials、permit/default deny/
  forbid 试决策与设备详情均成功。
- one production 临时 provisioning 管理 Clients 均已停用；Hodor 永久 confidential 服务 Client
  保持启用。
- Secret、Token、TOTP、Cookie、Policy 正文、资源 ID 和主体资料未写入应用日志或验收输出。

## 与计划的差异和后续

- production 使用统一域名 `https://sso.example.com/authorization/api/v1`，没有额外的 one-authz
  公网域名，也不使用 Cloudflare Access。
- 未增加 Service Binding；当前 Hodor 与 one 是独立部署，继续使用严格 HTTPS Gateway。
- 当前仍是服务主体 + `hodorActor` context。若进入用户主体 ABAC，应先设计 Token Exchange 或用户
  Token 传播，不得把本地用户 ID 冒充 one principal。
- enforce、完整四象限观测、策略管理 UI 和历史表清理均不属于本试点。
