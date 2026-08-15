# 统一 OAuth 与飞书企业登录详细设计

## 1. 背景与目标

当前 GitHub OAuth 的授权、组织校验、用户自动创建、绑定与 HTTP 适配集中在 `system/auth/service.ts`，职责耦合且无法安全复用。此次建立 `system/auth/oauth` DDD 垂直切片，同时接入飞书企业自建应用，并统一为“先有 Hodor 用户、再绑定外部身份”的账号模型。

目标如下：

- GitHub、飞书均只负责身份验证和账号绑定，不自动注册 Hodor 用户。
- 未绑定的外部身份登录统一返回 403，文案为“账号未绑定，请联系管理员”。
- OAuth state 由服务端生成、保存十分钟、绑定上下文且只能消费一次。
- 外部 token 与通讯录档案使用 AES-GCM 加密，敏感内容不返回前端、不进入日志。
- GitHub 每次登录重新验证组织成员资格；飞书每次登录重新验证租户、可用范围及在职状态。
- GitHub 解绑优先撤销远端授权，撤销失败时保留本地绑定。

## 2. 分层架构

`system/auth/oauth` 分为四层：

- `domain`：Provider、授权意图、外部身份、租户/组织资格、账号状态、回调来源和凭证约束等纯规则。
- `application`：生成授权 URL、登录回调、绑定回调、解绑和读取档案等用例；只依赖 Repository、State Store、Provider、Cipher、Clock、ID Generator 等端口。
- `infrastructure`：GitHub/飞书 Provider、Drizzle Repository、KV state、AES-GCM、环境配置及默认装配。
- `interfaces/http`：请求响应 Schema、当前用户适配、错误到现有 `BusinessError` 的映射，以及本地 JWT 登录结果适配。

原 `system/auth/service.ts` 保留本地账号密码登录、刷新 Token、个人资料等既有接口，并通过稳定 OAuth 门面调用新用例。HTTP 默认导出继续保持纯 API 对象。

## 3. OAuth 状态与回调

新增全 POST 接口：

- `/oauth/login/url`
- `/oauth/login/callback`
- `/oauth/account/url`
- `/oauth/account/callback`
- `/oauth/binding/unbind`
- `/oauth/binding/profile`

前端回调页面统一为 `/oauth/callback`。授权 URL 用例生成高熵随机 `state`，在 KV 中保存 provider、intent、redirect URI、当前用户 ID 和十分钟过期时间。回调采用读取后删除，并以同 isolate 的 in-flight 锁拒绝并发重入；过期、上下文不匹配或已删除的 state 均拒绝。Workers KV 不提供跨 isolate/PoP 原子 compare-and-delete，因此严格分布式一次性消费属于后续 D1/DO ledger 工作，不能把本轮实现描述成全局原子。

`redirectUri` 必须是合法 HTTP(S) URL，origin 必须位于 `OAUTH_ALLOWED_REDIRECT_ORIGINS`。本地开发允许显式配置 `http://localhost:5173`，生产不隐式放宽。

## 4. 绑定模型与加密

扩展 `system_user_oauth`：租户标识、加密档案、加密 access token、可选 refresh token、scope、token 过期时间、最后验证时间。建立 `(provider, provider_id)` 和 `(user_id, provider)` 唯一索引。

`OAUTH_SENSITIVE_DATA_KEY` 作为 32 字节密钥材料，基础设施层使用 AES-GCM 加密。AAD 至少绑定表用途、provider、providerId、userId 和字段用途，防止密文跨记录或跨字段替换。飞书 user access token 仅用于当前回调内的 user info/contact 查询，不长期保存；GitHub token 为后续撤权而加密保存。完整档案独立保存，不覆盖 Hodor 用户名、语言、部门、角色或权限。

## 5. Provider 行为

### 5.1 GitHub

- scope 保持 `user:email read:org`。
- 回调交换 token 后读取用户资料并验证 `GH_ORG_NAME` active membership。
- 登录只查找现有绑定；不存在时返回统一 403，不创建 `system_user`。
- 绑定时保存加密 token 和安全档案摘要。
- 解绑通过 Basic Auth 调用 GitHub grant revoke；仅远端返回 204 后删除本地绑定。
- 历史绑定缺少 token 时，返回需重新授权状态；重新授权必须匹配原 providerId，成功后撤权并删除绑定。

### 5.2 飞书

- 使用 OAuth v2 获取 user access token，随后调用 `authen/v1/user_info` 与 contact v3 用户接口。
- 必须属于 `FEISHU_ALLOWED_TENANT_KEYS`，且通讯录状态未离职、未冻结、未停用；联系接口或可用范围无法读取时拒绝登录。
- 同步姓名、英文名、头像、手机号、邮箱、工号、职位、部门、上级、状态、管理员身份、入职时间、地区、工位、员工类型和自定义字段等通讯录快照；不读取 CoreHR、薪资与考勤。
- 解绑只删除 Hodor 本地绑定。

## 6. 日志与安全边界

`safeFetch` 增加 OAuth metadata-only 审计模式，只记录 provider、host、path、HTTP 状态和耗时。统一脱敏 code、token、secret、Authorization、Cookie、手机号及常见敏感字段；OAuth 的 query、请求/响应正文不落库、不打印。

API 只返回绑定摘要和经明确选择的档案展示字段，永不返回密文、token、refresh token、authorization code 或 secret。前端档案仅保存在组件内存中，关闭弹窗即释放，不写 localStorage/sessionStorage。

## 7. 数据库与部署

- 修改 Drizzle 模型并通过 Windows 工具生成/核对 DDL。
- 增加不可变的 D1 增量 migration，保留历史 migration。
- 更新 D1 schema contract，迁移与 contract gate 必须位于 Worker deploy 之前。
- GitHub Actions 上传飞书和 OAuth 新增 secrets；仓库仅提供变量名与示例，不提交真实凭据。

## 8. 前端与 Playwright

- 登录页提供 GitHub/飞书入口，共用统一 OAuth callback 页面。
- 个人资料页展示各 Provider 绑定状态、绑定/解绑动作及按需加载的飞书档案。
- 实际 Provider 测试使用 Windows headed Playwright 独立 persistent profile，路径位于已忽略的 `platform/playwright/.auth/`；不覆盖 Hodor `storageState`，不录制 video/trace。
- CI 只执行 Mock Provider 合约与 UI 测试，不依赖 OTP、扫码或 CAPTCHA。

## 9. 测试策略

- Domain：redirect origin、state 生命周期、租户/组织、账号状态、Provider/intent 组合。
- Application Fake Ports：未绑定 403 且用户数不变、重复绑定、本地用户禁用、档案加密刷新、token 加密、撤权失败保留本地记录、历史绑定重新授权。
- Provider/安全日志：Mock GitHub/飞书响应，断言日志中无 code/token/secret/手机号/敏感哨兵。
- HTTP/API：六个 POST 接口、Schema、状态码和旧本地登录接口回归。
- Windows：TypeScript、Vitest、server/admin build、OpenAPI、ESLint/Prettier、Playwright。

## 10. 真实验收与人工接管点

测试企业使用两个用户控制的真实飞书身份和两个已有 Hodor 用户。Agent 可导航和填写非敏感配置，但手机号、OTP、扫码、CAPTCHA、OAuth 同意，以及创建企业/应用、发布、冻结、离职、解散等外部状态变更，必须在动作发生前暂停并由用户完成或明确确认。
