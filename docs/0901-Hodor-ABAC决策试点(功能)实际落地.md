# Hodor ABAC 决策试点实际落地

## 当前状态

状态：代码、append-only migration、本地自动化检查和 one staging 只读协议探测已完成；所有提交已
推送到 `codex/hodor-abac-pilot`。远程 D1 migration、Hodor 专用 OIDC Client、Cedar 应用与策略、
Hodor 数据库配置和部署均未执行。

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
  audience、Client ID、加密 Client Secret、状态、配置版本和探测审计信息。
- 追加 Node migration `20260901_02_authorization_connection_configuration.sql` 和 D1 migration
  `0011_authorization_connection_configuration.sql`；没有修改或重排历史 migration。
- 初始化 SQL、Drizzle Schema、D1 contract 和 migration 测试保持一致，表不包含
  `FOREIGN KEY`/`REFERENCES`。
- Client Secret 复用 `HODOR_AUTH_MASTER_KEY`，使用记录级 AAD 加密。读取接口只返回
  `hasClientSecret`，不回显密文或明文。

### one 授权网关

- 严格验证 OIDC discovery issuer 和同源 token endpoint。
- 使用 Client Credentials、`authorization:decide` scope 和配置的 resource/audience 换取服务
  Token。
- 探测合并部署下的 `${authorizationBaseUrl}/readyz`，决策调用
  `${authorizationBaseUrl}/decisions/check`。
- fetch 统一设置 10 秒超时和 `redirect: error`；上游响应按固定 envelope 严格解析，异常时失败关闭。
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
- 在不写远程数据的前提下，多做了一次 one staging 只读协议探测。探测发现旧本地 staging 文件中的
  issuer 和 decision audience 已落后于合并后的 one 地址；严格校验正确拒绝了旧值。使用当前
  Discovery 和可信 audience 后，服务 Token、readiness 与决策链路成功，返回预期默认拒绝。
- 未增加 Service Binding。当前生产 Wrangler 不绑定尚未正式发布的 one-authz；Gateway 的 fetch 注入点
  保留了后续适配空间。

## 验证结果

- Authorization domain/application/infrastructure/repository/HTTP、migration 和 D1 deployment
  contract：8 个测试文件、40 个测试通过。
- 服务端 TypeScript `--noEmit` 检查通过。
- `@hodor/server` build 通过。
- Wrangler 4.100.0 Worker dry-run 通过；上传约 4665.10 KiB，gzip 约 925.61 KiB，既有 D1、KV、
  R2、AI 和 Durable Object bindings 均正常识别。
- one staging 只读协议探测通过：Client Credentials、合并路径 readiness 和 Cedar 决策均成功；
  当前策略返回 `allowed=false`、`POLICY_DENY`、policy revision 1，符合服务主体默认拒绝预期。
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

## 尚未执行

- 未向 staging/production Hodor D1 应用 `0011`。
- 未在 one 创建 Hodor 专用 confidential Client、Authorization application、Schema、Policy 或属性。
- 未调用 Hodor 管理 API 保存和探测连接配置；表在 migration 后默认保持空值，不影响现有业务。
- 未把任何现有业务接口切换到 ABAC，也未增加前端配置页。
- 未部署、合并、创建 PR 或修改 Cloudflare Worker/Access/Service Binding。

## 后续建议

1. 等外部身份迁移分支合入后更新本分支基线，再创建 Hodor 专用 confidential Client；不要复用 staging
   demo Client。
2. 以合并后的 one Discovery、authorization module base path 和当前 decision audience 为权威值，
   不复制旧 staging 文件中已过期的 issuer/audience。
3. 远程 migration 前保存 D1 Time Travel bookmark 和业务表计数；应用 `0011` 后先做只读 Schema
   Contract，再通过本地管理员 + TOTP 保存配置并探测到 `ready`。
4. 为 Hodor 单独注册 Cedar application、最小 Schema 与 default-deny 策略，先在
   `/pilot/check` 验证 permit/default deny/forbid。
5. 第一个业务接入应使用显式 opt-in、保留 RBAC 并失败关闭，同时记录双轨结果但不自动改变用户权限；
   数据稳定后再决定替换点。
6. 若要实现真正的用户主体 ABAC，应先选择 Token Exchange、one refresh family 或统一登录三种方案之一；
   在此之前不要根据 `hodorActor` context 冒充可信 principal。
