# Hodor 设备详情 ABAC 影子决策实际落地

## 当前状态

状态：代码、定向验证、PR 合并、生产部署和 match/mismatch/unavailable 三类真实验收均已完成。

`POST /api/v1/admin/mobile/device/get` 已接入 one-authz 旁路观察。Hodor Token、TOTP、RBAC、设备查询
和响应仍是唯一生效链路；ABAC allow、deny 或故障均不会改变业务结果。

## 实际完成范围

### 应用层观察

- `AuthorizationShadowObservation` 与 `AuthorizationShadowLogPort` 只输出脱敏比较事实。
- `observeShadowDecision()` 永不向业务调用方抛错：
  - RBAC 与 ABAC 一致时记录 `match`。
  - RBAC allow、ABAC deny 时记录 `mismatch`。
  - 配置、凭证、存储、网络、超时或协议失败时记录 `unavailable`。
- Shadow logger 自身失败会被吸收，不改变观察结果。
- 默认日志事件 `authorization.shadow.completed` 不包含用户、角色、设备、属性、Token、Cookie、
  Secret、请求正文或原始异常。

### 设备详情接入

- `getApi` 仍为 `POST /get`、`permission: read`，请求响应 Schema 未改。
- RBAC 通过且设备存在后，HTTP interface 构造 `MobileDevice` 决策：
  - `classification=1`。
  - `status` 由 `isEnabled` 推导为 `active | blocked`。
  - resource ID 只发往 one-authz，不写入 Shadow 日志。
  - actor 只复制 `userId`、`roleIds`、`isSuperAdmin`，不把 UserObj Token 交给 helper。
- Worker 通过 `executionCtx.waitUntil()` 承接已捕获拒绝的 Promise；Node 无 ExecutionContext 时运行同一
  已处理 Promise，不产生未处理 rejection。
- 设备不存在时维持原错误，且不触发 Shadow。

## 生产验收

- PR #97 已合入 `dev`，merge commit 为 `3b7537cdc7df3b67e6ca71b473f7f25a18b1becb`；对应 run
  `33899643535` 的测试与部署全部成功。
- 正常 revision 2 下，真实设备详情返回 HTTP 200；日志为 `rbacAllowed=true`、`abacAllowed=true`、
  `comparison=match`、`outcome=evaluated`。
- 临时激活 deny-all revision 3 后，同一设备详情仍返回 HTTP 200；日志为
  `rbacAllowed=true`、`abacAllowed=false`、`comparison=mismatch`，随后立即恢复 revision 2。
- 临时停用 Hodor Authorization connection 后，设备详情仍返回 HTTP 200；日志为
  `abacAllowed=null`、`comparison=unavailable`、`outcome=unavailable`，随后保存并测试恢复为
  `ready`。
- 最终只读复核：Hodor Authorization 配置 `ready`、`config_version=5`；one application active，
  `MobileDevice` Schema 为当前 Schema，revision 2 active，revision 3 inactive。
- Wrangler live tail 中应用自定义 Shadow 事件只包含 allowlist 字段；没有记录 Token、Cookie、Secret、
  设备 ID、用户资料或属性值。

## 验证结果

- Authorization application、设备 Shadow helper 和 HTTP 契约定向测试通过。
- Server TypeScript build、Wrangler 4.100.0 dry-run、`git diff --check`、LF/UTF-8 和新增
  `any/as any/@ts-ignore` 检查通过。
- 删除旧 SSO/Provider Secrets 后又完成一次真实 Identity Center + TOTP + 设备详情验收，Shadow
  仍匹配 revision 2，证明该链路不依赖已退役认证变量。

## 仍保留的边界

- 当前 Shadow 只观察 RBAC 已允许的请求，可发现 ABAC 误拒绝，不能观察 RBAC 拒绝但 ABAC 允许。
- principal 仍是 Hodor confidential Client；用户身份是服务端可信 `hodorActor` context。
- 未收集足够观测数据前不进入 enforce；完整四象限、用户 principal 传播和告警指标另开迭代。
