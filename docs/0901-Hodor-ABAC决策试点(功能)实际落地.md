# Hodor ABAC 决策试点实际落地

## 当前状态

状态：代码、append-only migration、one staging 授权资源配置和 Hodor 本地 Worker 真实链路验收已
完成。Hodor 远程 D1 migration、生产数据库配置和部署尚未执行。

本分支建立在 `codex/external-auth-via-one` 之上，不能脱离外部身份迁移分支单独合并。现有 Hodor
RBAC 仍是生产授权事实源；新增 ABAC 只存在于超级管理员试点接口，不改变任何业务路由的放行结果。

## 实际完成范围

### DDD 垂直切片

- 新增 `admin.system.authorization` bounded context，并按 `domain`、`application`、
  `infrastructure`、`interfaces/http` 分层。
- 领域层负责 URL、Client ID、Client Secret、Cedar 输入、保留 context 和状态转换规则。
- 应用层通过 Repository、Cipher、Gateway 和 Clock 端口编排连接读取、草稿保存、探测、停用和
  试决策，不依赖 Hono、Drizzle、Node 或 Cloudflare。
- 基础设施层实现 Drizzle Repository、AES-256-GCM 凭证适配器和 one OIDC/one-authz Gateway。
- HTTP 层保持纯 API 对象，通过独立 `index.ts` 挂载到 Admin Hono app factory。

### 数据与密钥

- 新增无外键单例表 `system_authorization_connection`，保存 issuer、authorization base URL、
  audience、Client ID、加密 Client Secret、可选 Cloudflare Access 服务凭据、状态、配置版本和探测
  审计信息。
- 追加 Node migration `20260901_02_authorization_connection_configuration.sql` 和 D1 migration
  `0011_authorization_connection_configuration.sql`，并为 Access 凭据追加 Node migration
  `20260901_03_authorization_access_credentials.sql` 和 D1 migration
  `0012_authorization_access_credentials.sql`；没有修改或重排历史 migration。
- 初始化 SQL、Drizzle Schema、D1 contract 和 migration 测试保持一致，表不包含
  `FOREIGN KEY`/`REFERENCES`。
- one Client Secret 与 Access Client Secret 都复用 `HODOR_AUTH_MASTER_KEY`，但使用彼此独立的
  记录级 AAD 加密。读取接口只返回 Client ID 和 `has*Secret` 布尔值，不回显密文或明文。

### one 授权网关

- 严格验证 OIDC discovery issuer 和同源 token endpoint。
- 使用 Client Credentials、`authorization:decide` scope 和配置的 resource/audience 换取服务
  Token。
- 探测合并部署下的 `${authorizationBaseUrl}/readyz`，决策调用
  `${authorizationBaseUrl}/decisions/check`。
- Access 启用时，discovery、token、readiness 和 decision 请求均注入 Access 服务凭据 Header；凭据
  来自 Hodor 权威数据库，不新增业务环境变量。
- fetch 统一设置 10 秒超时和 `redirect: manual`。该模式既兼容 workerd，又阻止敏感 Header 被自动
  转发到重定向目标；上游 3xx 按非成功响应失败关闭。
- 出站日志只包含 requestId、operation、host、path、status、duration 和 outcome，不记录 Header、
  Token、Secret、请求体、响应体、资源 ID 或属性值。

### 管理与试决策接口

新增以下 POST 接口：

- `/api/v1/admin/system/authorization/config/get`
- `/api/v1/admin/system/authorization/config/save`
- `/api/v1/admin/system/authorization/config/test`
- `/api/v1/admin/system/authorization/config/disable`
- `/api/v1/admin/system/authorization/pilot/check`

接口未加入匿名白名单，继续经过 Hodor Token 与 TOTP 门禁，并在 service 层额外要求超级管理员。
配置写入使用 `expectedVersion` 乐观锁；只有成功探测后的 `ready` 配置允许决策。

试决策以 Hodor confidential client 作为 Cedar service principal。当前 Hodor 用户 ID、角色 ID 和
超级管理员标记只作为服务端生成且调用方不能覆盖的 `hodorActor` context。系统没有把本地用户伪装成
one 用户，也没有把本地用户 ID 放入 `X-Authorization-Subject`。

## 与计划的差异

- 计划列出的 server app Node/Worker 组合根不需要改动：Admin 模块已有统一 app factory，新增路由在
  `server/packages/admin/src/system/index.ts` 挂载后会同时进入两个运行时。
- 测试与各代码切片同提交，没有额外制造只含既有测试的 `test(authz)` 提交；逻辑提交仍各自可验证。
- 没有生成新的静态 OpenAPI/前端类型文件。Hodor 的 Schema 注册来自同一 HTTP API 对象，本轮也没有
  新增前端调用方。
- 初次只读探测发现旧本地 staging 文件中的 issuer 和 decision audience 已落后于合并后的 one
  地址；严格校验正确拒绝了旧值。随后经 one 管理 API 创建 Hodor 专用 confidential Client、
  Authorization application、Schema 和两条 Cedar Policy，并激活已校验修订。
- staging 由 Cloudflare Access 保护，Hodor Gateway 因此增加数据库配置化的可选 Access 服务凭据。
  首次本地 Worker 探测还发现 workerd 在 `redirect: error` 请求准备阶段抛出 `TypeError`；改为
  `manual` 后完成真实链路，且未添加不必要的 `global_fetch_strictly_public` 兼容开关。
- 未增加 Service Binding。当前生产 Wrangler 不绑定尚未正式发布的 one-authz；Gateway 的 fetch 注入点
  保留了后续适配空间。

## 验证结果

- Authorization domain/application/infrastructure/repository/HTTP、migration 和 D1 deployment
  contract：8 个测试文件、42 个测试通过。
- 服务端 TypeScript `--noEmit` 检查通过。
- `@hodor/server` build 通过。
- Wrangler 4.100.0 Worker dry-run 通过；上传约 4670.31 KiB，gzip 约 926.32 KiB，既有 D1、KV、
  R2、AI 和 Durable Object bindings 均正常识别。
- one staging 远程 D1 只读复核确认：1 个启用的 Hodor confidential Client、1 个 active
  Authorization application、1 个 active policy pointer、1 个 validated revision 和 2 条 Policy。
- 写入 one staging 前已分别创建 identity/authorization D1 Time Travel bookmark，并只保存在 Git
  忽略的本地恢复文件中。
- one staging 直接验收与 Hodor 本地 Worker 端到端验收都观察到 permit、默认拒绝和 forbid；后者
  完整经过密码登录、TOTP、配置读取/保存/测试、Client Credentials 和试决策接口。
- Hodor 本地 D1 ledger 包含 `0010`、`0011` 和 `0012`；Authorization 配置最终为 `ready`，Access
  ID/密文均已保存，`PRAGMA foreign_key_list('system_authorization_connection')` 为空。
- 变更文件 ESLint、Prettier、`git diff --check`、UTF-8 无 BOM、LF 和新增
  `any/as any/@ts-ignore` 检查通过。
- 本轮完成两轮复盘：第一轮收窄 HTTP 依赖类型并移除测试中的类型绕过；第二轮核对真实 one 契约、
  迁移边界、日志脱敏与最终构建结果。

## 提交记录

1. `4c437a8e docs(authz): design Hodor authorization pilot`
2. `b145507f feat(authz-domain): add connection and decision use cases`
3. `e60e21b2 feat(authz-storage): add encrypted connection persistence`
4. `c9c4caa2 feat(authz-runtime): add one authorization gateway`
5. `377ddd88 feat(authz-http): add configuration and pilot APIs`
6. `4969cdc2 fix(authz-http): enforce pilot request bounds`
7. `676e06e9 docs(authz): record Access-protected staging adjustment`
8. `d510a996 feat(authz): persist Access service credentials`

## 尚未执行

- 未向远程 Hodor D1 应用 `0011`/`0012`；本轮只迁移了本地 D1。
- 未向远程 Hodor 写入 Authorization 配置；`ready` 配置只存在于本地验收库。
- 未把任何现有业务接口切换到 ABAC，也未增加前端配置页。
- 未部署或合并；stacked draft PR #96 仍以外部身份迁移分支为基线。
- 未实现 one 用户 Token 到 Hodor 业务请求的用户主体传播；当前仍是服务主体 + 服务端生成的
  `hodorActor` context 试点。

## 后续建议

1. 先合并外部身份迁移 PR #95，再复核 stacked PR #96 的基线；两者都不能绕过生产部署确认。
2. 远程 Hodor migration 前重新创建 D1 Time Travel bookmark 和业务表计数；依次应用 `0010`、`0011`、
   `0012` 后先运行 Schema Contract，再通过管理员 + TOTP 保存配置并探测到 `ready`。
3. 第一个业务接入应使用显式 opt-in、保留 RBAC 并失败关闭，同时记录双轨结果但不自动改变用户权限；
   数据稳定后再决定替换点。
4. 若要实现真正的用户主体 ABAC，应先选择 Token Exchange、one refresh family 或统一登录三种方案之一；
   在此之前不要根据 `hodorActor` context 冒充可信 principal。
