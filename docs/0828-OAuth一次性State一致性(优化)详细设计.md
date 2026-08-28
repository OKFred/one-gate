# OAuth 一次性 State 一致性优化详细设计

## 1. 背景与现象

生产移除 Hodor 的 Cloudflare Access 后，GitHub 登录可以完成 Provider 授权，但
`/api/v1/admin/system/auth/oauth/login/callback` 返回 `400 INVALID_PARAMS`。Worker 日志显示
该请求没有进入任何 GitHub 出站调用；同一环境中的 one-sso 使用 D1 事务表，能够完成 OIDC
授权码交换并按预期返回“账号未绑定”。

现有 GitHub、飞书 OAuth state 写入 Cloudflare KV，并在授权回调中立即读取和删除。KV 是最终
一致存储，授权请求与回调可能落到不同边缘位置，刚写入的 state 可能暂时不可见。应用随后将
它判定为无效 state，形成与网络位置和传播时序相关的间歇性登录失败。

## 2. 目标与边界

- 将 GitHub、飞书 OAuth state 改为 D1 权威存储和原子单次消费。
- 保持现有 OAuth HTTP 路径、请求响应、十分钟有效期、Provider 规则和“不自动注册”语义不变。
- 不修改现有用户、OAuth 绑定或 one-sso 数据。
- migration 只追加且不声明外键。
- state 原文、授权码、Token 和 Provider Secret 不进入数据库日志或错误响应。

## 3. 分层设计

- Domain：继续使用 `OAuthStateRecord` 表达 provider、intent、redirect URI、用户和过期时间。
- Application：`OAuthStatePort` 增加带消费时间的原子消费和退休记录清理能力；用例仍只依赖端口。
- Infrastructure：Drizzle 适配器负责生成 256 位随机 state、保存 SHA-256 摘要、原子消费和清理。
- Interface：HTTP 契约不变；错误映射保留具体安全错误码和 `requestId`，便于关联 Worker 日志。

## 4. 数据模型与原子性

新增 `system_oauth_state`：

- `state_digest`：state 的 SHA-256 Base64URL 摘要，主键；不保存 state 原文。
- `provider`、`intent`、`redirect_uri`、`user_id`：可信服务端上下文。
- `expires_at_utc`、`consumed_at_utc`、`create_time_utc`：生命周期与审计时间。
- `system_oauth_state_expiry_idx`：支持清理过期或已消费记录。

消费使用单条 `UPDATE ... WHERE consumed_at_utc IS NULL AND expires_at_utc > now RETURNING`。
并发、重放或过期请求最多只有一个成功。创建新授权 URL 时顺带删除已消费和过期记录，避免
一次性数据长期积累。

## 5. 可观测性与前端反馈

OAuth/SSO 错误映射保留领域错误码，统一错误处理中只记录 `requestId`、路由、状态和错误码。
回调页只展示后端允许公开的错误码和响应头 `x-request-id`，不展示 code、state、Token、Cookie、
请求体或完整回调 URL。

## 6. 部署与恢复

部署继续使用 migration-first：先应用追加 migration，再执行 schema contract，最后发布 Worker 和
前端。migration 只创建新表，回滚 Worker 不要求回滚数据；旧表可暂时保留。任何生产 D1 恢复
仍需用户重新确认。
