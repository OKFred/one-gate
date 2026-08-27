# 统一 SSO 与 Access 门禁计划变更

## 实施顺序

1. 新增类型化路由政策 manifest，并让 `encapsulation` 从中推导认证豁免。
2. 统一 core request ID、结构化访问/错误日志和安全出站日志，补 CORS/OPTIONS 契约。
3. 增加 SSO domain/application/ports 及 Fake Ports 测试。
4. 追加无外键 migration、Drizzle model 与 repository；验证空库和升级路径。
5. 增加 SSO HTTP API 和 one-sso OIDC adapter，使用本地 `jose`。
6. 增加管理端 API 封装、登录按钮、callback 和账号绑定 UI；同步 OpenAPI 类型。
7. Windows 联合启动 two services，完成未绑定拒绝、显式绑定、登录、解绑和 request ID 日志验收。
8. 补实际落地文档，逐功能提交并推送。
9. 经用户确认后执行 Access policy、D1 migration、staging/production 部署和真实 smoke。

## 预计变更范围

- `server/packages/core/src/middleware/*`：route manifest、request ID、日志、错误和 CORS。
- `server/packages/admin/src/system/auth/sso/*`：四层 SSO 垂直切片。
- `server/packages/admin/src/system/auth/*`：挂载与稳定登录门面。
- `server/packages/admin/src/**/model.ts`、core DDL/migrations：两张无外键表。
- `platform/packages/ui/src/api/admin/system/*`：类型安全 SSO API。
- `platform/apps/admin/src/pages/login`、OAuth callback 和账号页：SSO 交互。
- `platform/packages/ui/src/locales/{zh-CN,en-US}/auth.ts`：SSO 文案。
- 部署核验脚本与配置示例：Access policy 分类检查，不包含实际凭据。

## 兼容性和数据影响

- 现有 HTTP 路由、Hodor JWT、GitHub/飞书、本地密码和设备协议保持不变。
- 仅追加 SSO 路由和数据库对象；不修改既有 migration，不使用外键，不迁移现有数据。
- 前端 OpenAPI 类型由运行中的后端生成，不手改生成文件。
- Access 尚未配置前，应用仍依靠现有 Hodor auth/API Token；配置后形成边缘加应用双层门禁。

## 小提交建议

1. `docs: design SSO gateway integration`
2. `refactor(core): centralize access route policy`
3. `feat(observability): unify Hodor request logs`
4. `feat(auth-sso): add OIDC domain and application use cases`
5. `feat(auth-sso): persist bindings and transactions`
6. `feat(auth-sso): expose Hodor SSO APIs`
7. `feat(admin): add SSO login and binding UI`
8. `test(auth-sso): add local integration acceptance`
9. `docs: record SSO gateway implementation`

每个提交独立通过受影响范围检查；Cloudflare 配置、远程 migration 和部署不混入代码提交。
