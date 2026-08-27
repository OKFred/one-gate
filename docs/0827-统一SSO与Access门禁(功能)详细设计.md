# 统一 SSO 与 Access 门禁详细设计

## 背景与目标

Hodor 当前支持本地密码、GitHub 和飞书登录，但尚未消费独立的 `one-sso`。同时
`encapsulation` 内维护的匿名白名单混合了浏览器入口和设备机器回调，Cloudflare Access 配置无法
可靠复用，Workers 与 Node 日志也缺少统一的请求链路字段。

本次目标是在不替换现有登录方式的前提下增加 one-sso 登录与显式绑定；用一份类型化路由政策清单
同时驱动 Hodor 认证豁免和 Access 部署核验；统一两侧结构化日志与 `x-request-id`，使登录、OIDC、
鉴权失败和出站调用可串联排查。

## 范围与非目标

- 新增 SSO 登录、绑定、解绑和绑定摘要；未绑定主体统一返回 403“账号未绑定，请联系管理员”。
- 使用标准 OIDC Authorization Code + S256 PKCE；本仓库使用本地 `jose` 验证 JWT/JWKS。
- 增加无外键声明的 SSO identity 与一次性 transaction 表及 append-only migration。
- 增加 Access 路由分类、结构化日志、CORS/OPTIONS 安全契约和管理端最小 UI。
- 保留本地密码、GitHub、飞书、现有 Hodor JWT、RBAC 和设备 API Token。

本次不迁移现有用户或 OAuth 绑定，不自动注册或按邮箱合并，不撤销尚未过期的 Hodor JWT，不把
菜单/RBAC/ABAC 迁入 one-sso，也不删除既有登录方式。

## Bounded context 与依赖方向

在 `admin.system.auth.sso` 建立垂直切片：

- domain：issuer/subject identity、intent、transaction 状态、绑定唯一性和回调规则。
- application：生成授权 URL、消费回调、绑定、登录、解绑和摘要用例；依赖 repository、OIDC client、
  clock、ID generator 和 token issuer 端口。
- infrastructure：Drizzle repository、Discovery/JWKS/Token adapter、PKCE/摘要和组合根。
- interfaces/http：集中 Schema、POST 参数适配、错误映射；默认导出纯 API 对象。

Hodor 不导入 `one-person-company` 内部包；协议适配器仅使用标准 HTTP 和本地 `jose`。前端只调用
`@hodor/ui` 中独立 API 封装。

## 路由政策单一事实源

建立不可变、类型化 manifest，至少区分：

### 浏览器匿名但必须经过 Access OTP

- `/admin/system/auth/login`
- `/admin/system/auth/oauth/login/url`
- `/admin/system/auth/oauth/login/callback`
- `/admin/system/auth/sso/login/url`
- `/admin/system/auth/sso/login/callback`
- `/admin/i18n/translation/listAll`

### 机器调用，可绕过 Access OTP，但仍须应用层机器凭证

- `/admin/mobile/async-task/callback`
- `/admin/mobile/device/report/presence`
- `/admin/mobile/device/report/info`
- `/admin/mobile/device/report/event`
- `/admin/mobile/device/report/deployment`
- `/admin/mobile/device/report/network-routing`
- `/admin/mobile/client-release/upload/prepare`
- `/admin/mobile/client-release/upload/finalize`

设备运维 WebSocket 单独分类。`encapsulation` 只从 manifest 推导“免 Hodor 用户 JWT”集合；Access
核验脚本读取同一 manifest 检查更具体路径优先级、OPTIONS 和机器 service-token 策略。Access 放行
不等于应用鉴权放行：机器路由继续验证现有 Hodor API Token。

`/admin/mobile/device-app/callback` 保留旧 payload 与响应，并强制从 `X-Device-Token` 读取令牌；服务端
先按 `taskId` 查询任务归属的 `clientId` 并校验设备上报令牌，认证通过后才允许写入任务状态，因此可按
机器路由配置 Access Bypass。query/body 中的令牌不参与认证。

Access OTP 仅允许 `developer@example.com`。自动化调用使用 Cloudflare Access Service Token，再叠加
现有 Hodor API Token。远端 Access 政策写入必须在代码、本地测试和配置 diff 经确认后执行。

## SSO 数据与状态

新增表均不声明 `FOREIGN KEY`/`REFERENCES`：

- `system_user_sso_identity`：Hodor user ID、标准化 issuer、subject、tenant/membership 摘要、绑定状态、
  创建/更新时间；`(issuer, subject)` 与 `(user_id, issuer)` 唯一。
- `system_sso_oidc_transaction`：state 摘要、intent、预期 Hodor user ID、PKCE verifier 加密信封、nonce
  摘要、redirect URI、过期/消费时间和创建时间。

应用层原子写入并验证 user 存在和启用状态。state、nonce 和 PKCE verifier 10 分钟过期且只消费
一次；数据库只保存 state/nonce 摘要，verifier 使用现有根敏感数据密钥 AES-GCM 加密并以 transaction
ID 作为 AAD。清理任务只删除已过期 transaction，不级联业务数据。

## HTTP 与登录行为

所有 Hodor 业务接口继续使用 POST：

- `/admin/system/auth/sso/login/url`
- `/admin/system/auth/sso/login/callback`
- `/admin/system/auth/sso/account/url`
- `/admin/system/auth/sso/account/callback`
- `/admin/system/auth/sso/binding/unbind`
- `/admin/system/auth/sso/binding/summary`

前端固定回调页接收 OIDC `code/state` 后 POST 给 Hodor；授权 URL 和 callback redirect 均需精确白名单。
登录回调验证 Token 后，以 `(issuer, sub)` 查找绑定；不存在返回 403且用户数不变。绑定意图必须携带
已认证 Hodor user，且 subject 和 user 两侧均不得重复绑定。成功登录继续签发现有 Hodor JWT。

## CORS、request ID 与日志

- Access 前的 `OPTIONS` 按部署策略到达 origin；origin 使用显式可信 origin、允许凭证和最小 headers。
- Axios 启用凭证以携带 Access Cookie；不把 Access assertion 存入 localStorage。
- 接受安全格式的 `x-request-id`，否则生成 UUID；响应始终回写并传给 one-sso 出站请求。
- 两侧统一字段：`timestamp/level/service/event/requestId/method/route/status/durationMs`，以及有界的
  `code/authMethod/authOutcome/provider/upstreamHost/upstreamPath`。
- 禁止记录 header、query、body、Token、密码、code/state/nonce、邮箱、手机号和第三方正文；未知异常
  只记录稳定错误分类，不输出完整对象或堆栈到 Workers Logs。

## 测试与验收

- domain/Fake Ports：state 过期与重放、redirect、PKCE、issuer/audience/nonce、重复绑定、本地用户停用、
  未绑定不注册、解绑和 OIDC 故障。
- route manifest：每条现有白名单准确分类，WebSocket 独立，Access 与 Hodor 豁免无漂移。
- HTTP：API 对象、Schema、错误码、`x-request-id`、CORS 和敏感日志哨兵。
- 前端：SSO 登录、绑定/解绑、callback、现有三种登录回归，凭证不落 localStorage。
- Windows 运行 server/platform TypeScript、定向 Vitest、build、OpenAPI 生成、ESLint/Prettier。
- 联合本地验收后，再经确认创建 OIDC client、应用 migration、配置 Access、部署 staging 与 production。
