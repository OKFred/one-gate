# Hodor ABAC 决策试点计划变更

## 1. 交付顺序

1. 记录试点边界、服务主体限制和部署 ADR 结论。
2. 新增 AuthorizationConnection 领域模型、应用端口和 Fake Ports 测试。
3. 追加无外键 SQLite/D1 migration、Drizzle model 和 Repository。
4. 新增加密凭证与 one OIDC/one-authz Gateway 适配器。
5. 新增超级管理员配置与试决策 HTTP API，并接入 Admin Hono app factory。
6. 更新 Schema Contract、OpenAPI 生成链和部署前检查。
7. 完成受影响检查、复盘和实际落地文档。

## 2. 预计文件

### 文档

- `docs/0901-Hodor-ABAC决策试点(功能)详细设计.md`
- `docs/0901-Hodor-ABAC决策试点(功能)计划变更.md`
- `docs/0901-Hodor-ABAC决策试点(功能)实际落地.md`

### Bounded context

- `server/packages/admin/src/system/authorization/domain/*`
- `server/packages/admin/src/system/authorization/application/*`
- `server/packages/admin/src/system/authorization/infrastructure/*`
- `server/packages/admin/src/system/authorization/interfaces/http/*`
- `server/packages/admin/src/system/authorization/index.ts`

### 组合与契约

- `server/packages/admin/src/system/index.ts`
- `server/packages/admin/src/index.ts`
- `server/apps/server/src/index.ts`
- `server/apps/server/src/node.ts`
- `server/apps/server/src/worker.ts`
- 必要的 server app 类型与测试文件。

### 数据

- `server/packages/admin/src/system/authorization/model.ts`
- `server/packages/core/src/db/sql/admin/system_authorization_connection.sql`
- `server/packages/core/src/db/migrations/20260901_02_authorization_connection_configuration.sql`
- `server/apps/server/d1-migrations/0011_authorization_connection_configuration.sql`
- `server/apps/server/d1-contract/worker-schema.sql`
- migration/Schema Contract 测试。

## 3. 接口影响

新增：

- `POST /api/v1/admin/system/authorization/config/get`
- `POST /api/v1/admin/system/authorization/config/save`
- `POST /api/v1/admin/system/authorization/config/test`
- `POST /api/v1/admin/system/authorization/config/disable`
- `POST /api/v1/admin/system/authorization/pilot/check`

既有接口、响应、RBAC、菜单和前端行为不变。新接口不加入认证白名单，因此自动要求主登录与
TOTP；服务层再校验超级管理员身份。

## 4. 数据影响

- 新增一张单例配置表，无外键。
- 不修改现有用户、角色、权限、SSO 绑定和历史 OAuth 表。
- 不自动写入配置；migration 后表为空，现有业务不受影响。
- 不执行远程 migration。

## 5. 提交拆分

1. `docs(authz): design Hodor authorization pilot`
2. `feat(authz-domain): add connection and decision use cases`
3. `feat(authz-storage): add encrypted connection persistence`
4. `feat(authz-runtime): add one authorization gateway`
5. `feat(authz-http): add admin configuration and pilot APIs`
6. `test(authz): verify migration and server integration`
7. `docs(authz): record Hodor authorization pilot implementation`

每个提交保持其影响范围可类型检查和测试；不 squash，不混入现有身份迁移 PR。

## 6. 验收门

- 新增测试全部通过，且未新增 `any`、`as any`、`@ts-ignore` 或双重断言。
- 服务端 TypeScript 与 build 通过。
- Worker dry-run 能打包，且无 Node-only 依赖进入 Worker。
- migration 与初始化 SQL 一致，`PRAGMA foreign_key_list` 为空。
- API 和结构化日志不包含 Secret、Access Token 或上游正文。
- `git diff --check`、UTF-8 无 BOM 和 LF 检查通过。

## 7. 远程验收待办

本地代码合入后，另行取得用户确认再执行：

1. 在 one staging 创建 Hodor confidential Client，授权 `authorization:decide`。
2. 在 one-authz staging 注册 Hodor application、Schema、Policy 和属性。
3. 将一次性 Client Secret 通过 Hodor 管理 API 加密入库。
4. 探测配置并运行 permit/default deny/forbid 试决策。
5. 再决定是否增加 staging Service Binding 及真实业务路由的 opt-in ABAC。

## 8. 2026-09-01 计划调整

staging 首次真实探测在 Access 边界失败，因此在继续验收前追加以下小切片：

1. 扩展 AuthorizationConnection，增加可选 Access 服务凭证及成对校验。
2. 追加本地 `20260901_03` 与 D1 `0012` migration；同步 Drizzle、初始化 SQL 和 Schema Contract。
3. 使用独立 AAD 加密 Access Client Secret，并在 Gateway 的全部同源请求中注入服务凭证 Header。
4. 增加 domain/application/repository/gateway/HTTP 脱敏测试。
5. 重新应用本地 migration，完成 `config/test` 和 permit/default deny/forbid 验收。

提交边界保持独立：

- `docs(authz): record Access-protected staging adjustment`
- `feat(authz): support database-backed Access service credentials`
- `docs(authz): close staging authorization acceptance`
