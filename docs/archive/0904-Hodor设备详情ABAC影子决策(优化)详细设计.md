# Hodor 设备详情 ABAC 影子决策详细设计

## 背景与目标

Hodor 已有 RBAC 权限中间件，`POST /api/v1/admin/mobile/device/get` 通过
`permission: { action: "read" }` 保护。系统同时已经具备数据库配置化的 one-authz 连接与服务主体
试决策能力，但尚未进入真实业务请求链路。

本迭代选择设备详情作为第一个业务 Shadow Mode 切片。在不改变现有访问结果的前提下，把 RBAC
已允许的真实请求复制为 one-authz 决策，记录两套模型的一致性，为后续决定是否进入 enforce 提供
数据。它不是一次权限切换，也不扩大 one-authz 的可用范围。

## 范围

本次只修改 `node_server` feature branch：

- 观察 `POST /api/v1/admin/mobile/device/get`。
- 保持路径、方法、请求、响应、RBAC 权限、错误和 OpenAPI Schema 不变。
- 不修改 `encapsulation`、数据库、migration、前端、菜单或权限种子。
- 不接入列表、更新、删除、敏感信息或其他业务接口。
- 不将 ABAC 结果用于允许或拒绝请求。

## 调用时序

1. `encapsulation` 完成 Hodor Token、TOTP 和 `mobile.device:read` RBAC 检查。
2. 设备 HTTP 接口执行原有 `getDevice(id)`。
3. 设备不存在时原样返回现有错误，不触发 Shadow。
4. 查询成功后构造最小可信决策输入：
   - action：`read`
   - resource type：`MobileDevice`
   - resource id：设备数字 ID 的字符串形式
   - attributes：`classification: 1`、`status: active | blocked`
   - context：由 Authorization application 注入只读 `hodorActor`
5. Worker 使用 `executionCtx.waitUntil()` 托管旁路 Promise；Node 使用已捕获拒绝的非阻塞 fallback。
6. HTTP 立即返回原设备详情，不等待 ABAC 网络结果。

`classification: 1` 表示当前接口返回的是经过既有脱敏投影的普通详情；`status` 只由数据库中的
`isEnabled` 推导，调用方不能覆盖。真正暴露敏感标识符的接口不在本迭代范围。

## 依赖方向

```text
mobile/device/interfaces/http
  -> system/authorization/facade
  -> system/authorization/application
  -> AuthorizationGatewayPort + AuthorizationShadowLogPort
  -> infrastructure/one-authorization-gateway + structured log adapter
```

- Device domain、DeviceCenter 和 Repository 不依赖 Authorization。
- 设备 HTTP helper 只能依赖稳定 facade，不直接引用 container、Repository 或 Gateway。
- Authorization application 不依赖 Hono、设备领域、Drizzle、Node 或 Cloudflare。
- `encapsulation` 与现有 `can()` 保持不变。
- 当前 principal 仍是 Hodor confidential Client；`hodorActor` 是 Hodor 服务端生成的可信 context，
  不是用户 Token 冒充的 principal。

## Shadow 结果模型

Application 增加永不抛错的 `observeShadowDecision()`：

- ABAC allow：`comparison=match`。
- ABAC deny：`comparison=mismatch`，但业务请求仍成功。
- 配置未就绪、凭证、网络、协议、超时或存储失败：`comparison=unavailable`。
- Shadow 日志失败也不得影响请求或产生未处理的 Promise rejection。

结构化日志只允许包含：

- `requestId`
- `rbacAllowed`
- `abacAllowed`
- `comparison`
- `outcome`
- `decisionId`
- `policyRevision`
- `durationMs`

不得记录设备 ID、资源属性、用户 ID、角色、Token、Cookie、Secret、请求/响应正文或原始异常。
one-authz outbound 审计继续只记录 host、path、状态和耗时。

## 已知限制与升级门槛

由于接入点位于 RBAC 成功后的业务接口，本版只能看到 RBAC allow 象限：

- 能发现 RBAC allow / ABAC deny。
- 不能发现 RBAC deny / ABAC allow。

在任何 enforce 变更前，必须另开迭代为 `encapsulation` 增加显式 opt-in 的观察钩子，收集完整
四象限；还必须验证用户主体 Token 传播、稳定策略版本、故障失败关闭、回滚开关和可接受的延迟。

## 验证策略

- Authorization application：allow、deny、未就绪和上游异常都生成脱敏结果且永不向外抛错。
- Device HTTP helper：决策输入只来自可信服务端数据；设备不存在不触发；后台调度不产生未处理
  rejection。
- Route contract：`get` 仍为 POST、`read` 权限、原请求响应 Schema 不变。
- Worker dry-run：不新增 binding，`waitUntil` 可用。
- dev 验收：分别观察 match、mismatch、unavailable，三种情况下设备详情响应保持一致。
