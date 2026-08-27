# 统一 SSO 与 Access 门禁实际落地

## 落地结果

- 新增 `system/auth/sso` 垂直切片，领域、应用、基础设施和 HTTP 接口依赖由外向内。
- 新增登录 URL、登录回调、绑定 URL、绑定回调、解绑和绑定摘要六个 POST 接口。
- 使用服务端一次性 state、S256 PKCE、nonce、严格 issuer/audience/tenant 校验；OIDC token、
  code、verifier 和 nonce 不写入数据库、浏览器存储或日志。
- login/bind 使用带 `intent` query 的两个精确 callback URI；后端把 intent 和当前用户纳入原子消费
  条件，错误入口不会烧掉 state。
- 新增两张无外键表保存 SSO 身份绑定和十分钟事务；事务以条件更新实现单次消费。
- 每次创建授权前清理已消费或过期 transaction，避免中间数据无限保留。
- Node 与 Worker 使用本地锁定的 `jose` 校验 one-sso EdDSA JWT 和 Cloudflare Access JWT。
- 管理端保留密码、GitHub、飞书入口，并新增 one-sso 登录、固定 callback、绑定和解绑。
- OpenAPI 类型由 Windows 本地 Worker `/doc.json` 生成，前端不保留手写重复 DTO。

## 门禁与日志

- 路由 manifest 区分浏览器匿名入口、机器接口和 WebSocket；Hodor 认证豁免从 manifest 推导。
- 旧 `device-app/callback` 先按任务读取设备，再验证 `X-Device-Token`，鉴权成功后才允许写状态。
- 生产环境强制校验 `Cf-Access-Jwt-Assertion`；非生产仅在显式开关启用。
- CORS 仅允许配置的精确 Origin、POST/OPTIONS、凭据和 `X-Request-Id`。
- 两侧请求完成日志统一包含 `service`、`event`、`requestId`、method、route、status 和 duration；
  Access、OIDC 出站及旧回调失败日志不输出请求正文、凭据或原始异常。

## 数据与配置

- 追加 D1 migration `0008_sso_gateway_identity.sql` 和对应 core migration/Schema Contract。
- 所有新增表均无 `FOREIGN KEY`/`REFERENCES`，引用完整性由应用层负责。
- 部署新增 SSO、Access 和浏览器 Origin 配置；样板写入 `.env.example`，真实值只进入忽略的
  本地变量文件和部署环境，不进入 Git。
- 当前仅执行本地 migration；远程 D1、Access policy、Worker/Pages 部署尚未执行。

## 已完成验证

- SSO 领域、应用、仓储、加密、OIDC、HTTP、Access、CORS、route policy、日志和旧回调定向
  Vitest 已执行。
- Server 构建通过；Admin TypeScript 与生产构建通过。
- Windows 本地 Worker 成功提供 `/doc.json`，六个 SSO 路径已进入生成的 OpenAPI 类型。
- one-sso `identity-hono` 59 项测试和类型检查通过；identity-service 构建已执行。
- `git diff --check`、定向 ESLint/Prettier 和无新增 `any/as any` 复核纳入最终交付检查。

## 尚待真实环境验收

1. 在 one-sso 为 `self` 租户创建 public OIDC client，保存只显示一次的 client ID。
2. 配置 Hodor 本地忽略变量、GitHub Environment 和 Worker secrets。
3. 配置 Cloudflare Access OTP 与机器 Bypass/Service Token policy；跨域 API Access 应用必须开启
   `options_preflight_bypass`，并用真实浏览器验证 OPTIONS。
4. 执行远程 migration、部署，再验收未绑定 403、显式绑定、登录、解绑、设备回调和 requestId
   串联日志。

上述远程操作需用户确认后执行。
