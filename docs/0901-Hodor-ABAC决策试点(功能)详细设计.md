# Hodor ABAC 决策试点详细设计

## 1. 背景与目标

`one` 已提供数据库驱动的 one-authz 与 Cedar 决策接口，Hodor 仍通过本地 RBAC
完成菜单和接口权限判断。本迭代建立第一个可运行的 Hodor → one-authz 垂直切片，验证：

- Hodor 能使用 one OIDC Client Credentials 获取服务 Token。
- Hodor 能把动作、资源、业务上下文和服务端生成的本地操作者上下文提交给 one-authz。
- 连接配置与加密 Client Secret 由 Hodor 数据库管理，不增加业务配置环境变量。
- Node HTTP 传输与未来 Cloudflare Service Binding 共用同一应用端口。
- one-authz 拒绝、配置缺失和上游故障都失败关闭，并可通过 `requestId` 关联日志。

本轮是服务主体试点，不替换现有 RBAC，也不声称已经完成用户主体授权。Hodor 在 SSO
回调后只保存本地登录态和身份摘要，并未持有可长期用于 one-authz 的 one 用户 Access
Token；账号密码登录更不存在 one 用户 Token。把本地用户 ID 塞进主体 Header 或请求体冒充
one 用户会破坏 one-authz 的可信主体边界，因此本轮 Cedar principal 固定为注册的 Hodor
服务 Client。Hodor 当前用户信息只作为由后端生成、调用方不可覆盖的 `hodorActor` context
提供给试点策略。

## 2. 范围

### 2.1 本轮实现

- 新增 `admin.system.authorization` bounded context，按 domain、application、infrastructure、
  interfaces/http 分层。
- 新增无外键单例表 `system_authorization_connection`。
- 新增连接读取、草稿保存、探测、停用和试决策用例。
- 新增 AES-256-GCM Client Secret 加密，继续使用既有 `HODOR_AUTH_MASTER_KEY` 根密钥，
  并使用记录级 AAD。
- 新增 one OIDC discovery、Client Credentials 与 one-authz HTTP 适配器。
- 新增仅超级管理员可访问、且继续受现有 TOTP 门禁保护的管理 API。
- 通过应用工厂注入 fetch 端口；Node 使用标准 fetch，Worker 后续可注入 Service Binding
  fetch，不在领域层读取 Worker Env。

### 2.2 明确不实现

- 不修改 `one-person-company` 的决策协议、Cedar Schema 或 Policy。
- 不替换 `encapsulation` 中的 RBAC，不改变现有菜单、角色、权限和数据范围行为。
- 不把本地 Hodor 用户伪装为 one 用户主体，不增加 Token Exchange 或用户 Token 持久化。
- 不创建/修改远程 one OIDC Client、Cedar 应用、Schema、Policy、D1 或 Worker 绑定。
- 不部署、不合并、不执行远程 migration。

## 3. 领域模型

### 3.1 AuthorizationConnection

单例 ID 固定为 `default`，字段为：

- `issuer`：one OIDC issuer。
- `authorizationBaseUrl`：one-authz 模块根地址，例如
  `https://one.example.com/authorization/api/v1`。
- `audience`：one-authz 决策 audience。
- `clientId`：在 one 中注册并具备 `authorization:decide` 的 confidential client。
- `encryptedClientSecret`：AES-GCM 密文；读取 API 只返回 `hasClientSecret`。
- `status`：`draft | ready | disabled`。
- `configVersion`：乐观锁版本。
- `lastTestedAtUtc`、`updatedByUserId` 和创建/更新时间。

URL 在领域边界完成归一化：生产只允许 HTTPS；开发允许 localhost HTTP；拒绝用户名、密码、
query 和 fragment。`issuer`、base URL 与 audience 均去除尾部 `/`。

### 3.2 状态转换

```text
missing/disabled/ready --save--> draft --test success--> ready
draft/ready/disabled --disable--> disabled
```

- 首次保存必须提供 Client Secret。
- 后续保存省略 Secret 时保留当前密文；提供新 Secret 时完成轮换并回到 `draft`。
- 只有 `ready` 连接允许执行决策。
- 所有写操作携带 `expectedVersion`；条件更新失败返回 409。

### 3.3 PilotDecision

试点请求包含 Cedar `action`、`resource { type, id, attributes }` 和可选 context。HTTP
边界只允许有限、可验证的 Cedar JSON 值，并限制请求体大小。服务端覆盖式加入：

```json
{
  "hodorActor": {
    "userId": "7",
    "roleIds": [1, 3],
    "isSuperAdmin": false
  }
}
```

客户端不得提交 `requestTime` 或 `hodorActor`。`requestTime` 仍由 one-authz 自己加入。

## 4. 应用与端口

`AuthorizationCenter` 暴露：

- `getConnection()`
- `saveDraft()`
- `testConnection()`
- `disableConnection()`
- `checkPilotDecision()`

应用层依赖：

- `AuthorizationConnectionRepositoryPort`
- `AuthorizationCredentialCipherPort`
- `AuthorizationGatewayPort`
- `AuthorizationClockPort`

Gateway 适配器按请求执行：

1. 读取 `${issuer}/.well-known/openid-configuration`。
2. 校验 discovery issuer、HTTPS/localhost 和同 issuer origin 的 token endpoint。
3. 通过 Client Credentials 请求 `authorization:decide`，resource 为配置 audience。
4. 调用 `${authorizationBaseUrl}/decisions/check`。
5. 严格校验成功或错误 envelope；不记录响应正文。

配置探测执行 discovery、Client Credentials 和 `${authorizationBaseUrl}/readyz`。探测只确认
身份和授权服务可达；应用注册、active Policy 与具体 Cedar 请求由试决策验收。

## 5. HTTP 接口

所有接口使用 POST，并沿用 Hodor 统一响应 envelope：

- `/api/v1/admin/system/authorization/config/get`
- `/api/v1/admin/system/authorization/config/save`
- `/api/v1/admin/system/authorization/config/test`
- `/api/v1/admin/system/authorization/config/disable`
- `/api/v1/admin/system/authorization/pilot/check`

前四个接口和试决策接口都要求：

- 有效 Hodor 登录 Token。
- 与当前 Token 匹配的 TOTP Cookie。
- 当前用户是超级管理员。

稳定错误分类：

- `AUTHORIZATION_CONFIGURATION_INVALID`
- `AUTHORIZATION_CONFIGURATION_CONFLICT`
- `AUTHORIZATION_CONFIGURATION_NOT_READY`
- `AUTHORIZATION_CREDENTIAL_FAILURE`
- `AUTHORIZATION_UPSTREAM_UNAVAILABLE`
- `AUTHORIZATION_UPSTREAM_REJECTED`
- `AUTHORIZATION_UPSTREAM_INVALID_RESPONSE`

one-authz 的合法拒绝仍是 HTTP 200，接口返回 `allowed: false`、`reason`、`decisionId` 和
`policyRevision`；它不是系统错误。

## 6. 持久化与安全

- migration 只追加本地 SQLite 与 Worker D1 文件，不修改历史 migration。
- 表不声明 `FOREIGN KEY` 或 `REFERENCES`。
- Client Secret 使用 `HODOR_AUTH_MASTER_KEY` 和 AAD
  `system_authorization_connection:default:client_secret:v1` 加密。
- Secret 只在保存、探测和决策请求的最小调用范围内解密。
- API、日志、测试快照和 OpenAPI 不返回 Client Secret、Access Token 或上游正文。
- 出站日志仅记录 `requestId`、operation、host、path、status、duration 和 outcome。
- 所有 fetch 设置 10 秒超时并禁止自动跟随重定向。

## 7. 双运行时与部署边界

应用工厂接收 `AuthorizationCenterResolver`：

- Node 组合根注入标准 fetch。
- Worker 组合根未来可按 URL 路由到 identity/authorization Service Binding。

本提交不写死 `staging-one`、`one-sso` 或任何自定义域名，也不在现有 production
`wrangler.jsonc` 中绑定尚未完成 production 验收的 one-authz。Cloudflare 官方 Service
Binding 属于部署资源绑定，待 staging 应用、Policy 和 Client 准备完成后再用单独提交开启。

## 8. 验证

- Domain：URL、状态转换、Secret 轮换、保留 context 和输入上限。
- Application：首次保存、乐观锁、探测成功/失败、disabled/not-ready、allow/deny。
- Infrastructure：discovery、token、readyz、decision envelope、超时/重定向/错误脱敏。
- Repository/migration：单例、状态约束、版本更新、无外键、Schema Contract。
- HTTP：超级管理员限制、Secret 不回显、错误映射、requestId 传播。
- 运行受影响服务端 Vitest、TypeScript、build、Worker dry-run 和 `git diff --check`。

## 9. 后续演进

试点通过后再选择用户主体方案：

1. one OAuth Token Exchange，验证 Hodor 的受信主体断言；或
2. Hodor 安全保存并轮换 one 用户 refresh family；或
3. 密码登录也迁移为 one 身份，使业务请求直接持有可验证的 one 用户 Token。

在方案落地前，现有 RBAC 继续是生产权限事实源，ABAC 仅用于显式试点接口。

## 10. 2026-09-01 计划调整：受 Access 保护的 staging 出站认证

真实 staging 验收发现，`one` staging 整站由 Cloudflare Access 保护。Hodor 通过公网 HTTPS
调用 discovery、token、readyz 和 decision 时，除了 one OIDC Client Credentials，还必须先通过
Access 服务身份。Access Client ID/Secret 不是租户业务环境变量，也不能写入日志或源码；本迭代把它
作为可选的连接配置持久化到 Hodor 数据库：

- `accessClientId` 明文保存，`accessClientSecret` 使用同一根密钥但独立 AAD 加密。
- 两者必须同时启用或同时关闭；首次启用或更换 Client ID 时必须提交 Secret。
- Gateway 仅在配置启用时为同源出站请求增加 `CF-Access-Client-Id` 与
  `CF-Access-Client-Secret`，不影响未使用 Access 的独立部署。
- 追加 migration 扩展现有单例表，不修改已经推送的 `0011`。
- 管理 API 只返回 `usesCloudflareAccess`、Access Client ID 和是否存在 Secret，不返回密文或明文。

该调整不把 Cloudflare Access 视为 one 用户身份，也不改变 Cedar principal；它只解决服务到服务的
网络入口认证。后续若改用同账户 Service Binding，可把 Access 配置设为 `null`，无需改变领域或决策
协议。
