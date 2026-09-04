# Hodor 设备详情 ABAC 影子决策实际落地

## 当前状态

状态：feature branch 代码和本地定向验证已完成；尚未合入 `dev`，未写入 Hodor 远程 D1，未对
`gate.example.com` 流量启用 Shadow。

本迭代把 `POST /api/v1/admin/mobile/device/get` 接入 one-authz 旁路观察。现有 Hodor Token、TOTP、
RBAC、设备查询和响应是唯一生效链路；任何 ABAC allow、deny 或故障都不会改变业务结果。

## 实际完成范围

### Authorization application

- 增加 `AuthorizationShadowObservation` 与 `AuthorizationShadowLogPort`，应用层只输出脱敏比较事实。
- 增加永不向业务调用方抛错的 `observeShadowDecision()`：
  - RBAC 与 ABAC 一致时记录 `match`。
  - RBAC allow、ABAC deny 时记录 `mismatch`。
  - 配置、凭证、存储、网络、超时或协议失败时记录 `unavailable`。
- Shadow logger 自身同步或异步失败会被吸收，不改变观察结果。
- 新增稳定 `system/authorization/facade.ts`，业务切片不直接引用 container、Repository 或 Gateway。
- 默认基础设施输出 `authorization.shadow.completed` JSON 日志；字段不包含用户、角色、设备、属性、
  Token、Cookie、Secret、正文或原始异常。

### 设备详情接入

- `getApi` 仍为 `POST /get`、`permission: read`，请求和响应 Schema 未改。
- RBAC 通过且设备存在后，HTTP interface 构造 `MobileDevice` 决策：
  - `classification=1`。
  - `status` 由 `isEnabled` 推导为 `active | blocked`。
  - resource ID 只发送给 one-authz，不写入 Shadow 日志。
  - actor 只复制 `userId`、`roleIds`、`isSuperAdmin`，不会把 UserObj 中的 Token 交给 helper。
- Worker 把已捕获拒绝的 Promise 注册到 `executionCtx.waitUntil()`；Node 没有 ExecutionContext 时继续
  运行同一已处理 Promise，不产生未处理 rejection。
- 设备不存在时保持现有错误，并且不会触发 Shadow。

## 验证结果

- Authorization application、设备 Shadow helper 和设备 HTTP 契约：3 个测试文件、28 个测试通过。
- 单独复核设备 helper 与 HTTP 契约：2 个测试文件、19 个测试通过。
- Server TypeScript build 通过。
- 变更 TypeScript 定向 ESLint 与 Prettier 通过。
- Wrangler 4.100.0 dry-run 通过；上传约 4.57 MiB、gzip 约 927 KiB，既有 D1、KV、R2、AI 和两个
  Durable Object binding 保持不变，没有新增资源绑定。
- `git diff --check`、新增 `any/as any`、UTF-8/LF、敏感字段和工作区状态在最终提交前复核。

## 真实边界

- 本版只能观察 RBAC 已允许的请求，能够发现 ABAC 误拒绝，不能发现 RBAC 拒绝但 ABAC 允许。
- principal 仍是 Hodor confidential Client，用户身份是服务端可信 `hodorActor` context；尚未把用户
  one-sso Token 作为 Cedar principal 传播。
- one-authz staging 当前已有旧试点 `Resource` Schema；`MobileDevice` Schema/Policy revision 尚未创建。
- Hodor ABAC connection 尚未写入远程 D1 或测试为 `ready`，因此没有线上 match/mismatch 数据。

## 合入与启用顺序

1. PR #95 外部身份迁移满足生产 one Provider 前置后合入 `dev`。
2. PR #96 更新 base 为 `dev`，应用 Authorization migrations，保存并测试连接为 `ready`。
3. 本分支更新 base 为 ABAC pilot，完成 CI 后合入 `dev`。
4. 在 one-authz 创建不可变 `MobileDevice` Schema 和策略修订，先模拟再激活。
5. 依次验收 `match`、可控 `mismatch` 和 `unavailable`；三种情况下设备详情 HTTP 结果必须相同。
6. 收集到足够观察数据前不进入 enforce；完整四象限和用户 principal 传播另开迭代。
