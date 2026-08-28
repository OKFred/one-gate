# OAuth 一次性 State 一致性优化计划变更

## 计划变更

1. 新增 `system_oauth_state` Drizzle 模型、全量 DDL、append-only core migration 和 Worker migration。
2. 将 `OAuthStatePort` 从 KV get/delete 改为 D1 原子消费，并增加退休记录清理。
3. 更新默认 OAuth 依赖装配，不再使用 KV 保存 OAuth state；KV 的其他用途不变。
4. 增加并发消费、重放、过期、摘要存储和清理测试。
5. 更新 Worker schema contract 和 deployment contract，确保 migration 在 Worker 发布前生效。
6. 保留 OAuth/SSO 领域错误码，在回调页展示安全错误引用和 `requestId`。
7. 运行受影响 TypeScript、Vitest、构建、格式、lint 和 `git diff --check`，再部署 dev 并完成
   GitHub 主认证、TOTP、one-sso 绑定及重新登录的生产验收。

## 兼容性

- HTTP 路径、请求响应成功结构和 Provider 回调地址不变。
- OAuth state 仍为十分钟、单次消费；变化仅是权威存储由 KV 改为 D1。
- 不新增外键，不修改已有用户和身份绑定数据。
- migration-first 部署期间旧 Worker 仍可使用 KV；新 Worker 只在新表通过 schema contract 后发布。

## 验收条件

- 创建授权后立即从不同请求消费也能稳定读取 state。
- 并发或重放只允许一次成功，过期 state 不可消费。
- D1 和日志均不出现 state 原文、授权码、Token 或 Secret。
- GitHub 登录不再出现无出站请求的 `INVALID_STATE`。
- 未绑定 one-sso 仍返回 `ACCOUNT_NOT_BOUND`；绑定后完整走通 one-sso → TOTP → Hodor。
