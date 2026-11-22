# 统一 OAuth 与飞书企业登录计划变更

## 1. 后端计划

- 新增 `server/packages/admin/src/system/auth/oauth/` 四层目录及稳定门面。
- 从 `system/auth/service.ts` 迁出 GitHub OAuth 业务，删除未绑定自动创建用户逻辑。
- 新增 GitHub、飞书 Provider，统一 state、绑定、登录、档案和解绑用例。
- 扩展 `system_user_oauth` Drizzle 模型、Repository、DDL、D1 migration 与 schema contract。
- 新增 AES-GCM 加密、KV state 与配置装配。
- 为 `safeFetch` 增加统一脱敏和 metadata-only 审计模式。
- 补充六个全 POST OAuth 接口的集中 Schema 与 HTTP 错误映射。

## 2. 前端计划

- 更新 `@hodor/ui` auth API 封装，使用生成的 OpenAPI 类型并移除现有 `as any`。
- 登录页增加飞书入口，GitHub/飞书共用 `/oauth/callback` 页面。
- 个人资料页增加 Provider 绑定摘要、解绑、重新授权和飞书完整档案弹窗。
- 增加中英文认证文案；不修改生成式权限常量。
- 档案只保存在 React 组件内存中，不持久化敏感资料。

## 3. 部署与配置计划

- 增加 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_ALLOWED_TENANT_KEYS`、`OAUTH_ALLOWED_REDIRECT_ORIGINS`、`OAUTH_SENSITIVE_DATA_KEY`。
- 更新 `.env.example`、Worker 类型/配置注释及 GitHub Actions secret 上传。
- 确保远程 D1 migration 与 schema contract gate 在 Worker 部署前执行并失败阻断。
- 不提交任何真实 App Secret、密钥、手机号、token、cookie 或浏览器登录态。

## 4. Playwright 与真实环境计划

- 增加 Mock Provider 的 UI/API 测试，供 CI 稳定运行。
- 增加 Windows headed 的真实 OAuth 辅助脚本/说明，使用 gitignored persistent profile，关闭 video/trace。
- 创建飞书测试企业、创建者和普通成员的外部动作在需要手机号、OTP 或最终确认时暂停。

## 5. 预计接口变化

新增：

- `POST /api/v1/admin/system/auth/oauth/login/url`
- `POST /api/v1/admin/system/auth/oauth/login/callback`
- `POST /api/v1/admin/system/auth/oauth/account/url`
- `POST /api/v1/admin/system/auth/oauth/account/callback`
- `POST /api/v1/admin/system/auth/oauth/binding/unbind`
- `POST /api/v1/admin/system/auth/oauth/binding/profile`

原 GitHub 专用 URL/callback/bind/unbind 前端调用迁移至新接口；本地账号密码、微信、refresh、check、profile 与资料更新接口保持兼容。

## 6. 数据库影响

- `system_user_oauth` 增加加密凭证、加密档案、租户、scope、过期时间和最后验证时间列。
- 新增两个唯一索引，不新增新的用户表，不自动写入 `system_user`。
- 生产必须先应用增量 migration，再部署读取新列的 Worker。

## 7. 验证清单

- 修改前后 Windows server/admin TypeScript 对比。
- OAuth Domain/Application/Provider/HTTP 定向 Vitest。
- 未绑定 GitHub/飞书均为 403 且用户数不变。
- GitHub 远端撤权失败不删除本地绑定；飞书档案与 GitHub token 为密文。
- 日志无敏感哨兵；前端存储无飞书档案。
- Windows server/admin build、OpenAPI、ESLint/Prettier、Playwright。
- `git diff --check`、LF/UTF-8/BOM、无新增 `any/as any`。
- 最多五轮复盘后输出同名“实际落地”文档，明确计划差异与真实外部验收状态。
