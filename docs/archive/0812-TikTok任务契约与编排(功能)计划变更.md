# TikTok 任务契约与编排计划变更

## 1. 计划目标

在不改变现有设备任务中心协议和持久化模型的前提下，把 `one-autojs6` 最新 TikTok contract v2 接入 `node_server`，形成可测试的 DDD 垂直切片和专用下发 API。

## 2. 预计文件变更

### 2.1 新增 TikTok 垂直切片

- `server/packages/admin/src/mobile/tiktok-task/domain/contract.ts`
  - v2 类型、默认值、纯归一化和领域异常。
- `server/packages/admin/src/mobile/tiktok-task/domain/contract.spec.ts`
  - 领域规则定向测试。
- `server/packages/admin/src/mobile/tiktok-task/application/ports.ts`
  - 任务下发、Actor 和 publication ID 生成端口。
- `server/packages/admin/src/mobile/tiktok-task/application/task-center.ts`
  - TikTok 下发用例。
- `server/packages/admin/src/mobile/tiktok-task/application/task-center.spec.ts`
  - Fake Ports 应用测试。
- `server/packages/admin/src/mobile/tiktok-task/application/error.ts`
  - 应用层可映射异常。
- `server/packages/admin/src/mobile/tiktok-task/infrastructure/container.ts`
  - async-task façade 与 Web Crypto 默认装配。
- `server/packages/admin/src/mobile/tiktok-task/interfaces/http/error.ts`
  - HTTP 业务错误映射。
- `server/packages/admin/src/mobile/tiktok-task/facade.ts`
  - 稳定应用门面。
- `server/packages/admin/src/mobile/tiktok-task/model.ts`
  - HTTP 请求响应 JSON Schema 集中定义。
- `server/packages/admin/src/mobile/tiktok-task/service.ts`
  - 纯 `dispatch` API 定义。
- `server/packages/admin/src/mobile/tiktok-task/service.spec.ts`
  - HTTP API 对象与 Schema 测试。
- `server/packages/admin/src/mobile/tiktok-task/index.ts`
  - 复用 `admin.mobile.async_task` 业务权限挂载。

### 2.2 修改现有模块

- `server/packages/admin/src/mobile/index.ts`
  - 挂载 `/tiktok-task`。
- `server/packages/admin/src/mobile/async-task/facade.ts`
  - 如适配器需要，公开稳定的任务中心应用异常类型；不改变现有函数行为。

### 2.3 文档

- `docs/0812-TikTok任务契约与编排(功能)详细设计.md`
- `docs/0812-TikTok任务契约与编排(功能)计划变更.md`
- 完成复盘后新增 `docs/0812-TikTok任务契约与编排(功能)实际落地.md`

## 3. 接口变化

新增：

- `POST /api/v1/admin/mobile/tiktok-task/v2/dispatch`

保持不变：

- `/api/v1/admin/mobile/async-task/list`
- `/api/v1/admin/mobile/async-task/dispatch`
- `/api/v1/admin/mobile/async-task/get`
- `/api/v1/admin/mobile/async-task/callback`
- MQTT v2 Topic 和载荷字段。

新接口复用 `admin.mobile.async_task:dispatch` 权限，不新增业务键、权限、菜单或翻译种子。

## 4. 数据与部署影响

- 不修改 Drizzle 表模型。
- 不生成 DDL 或 D1 Migration。
- 不执行远程 DDL。
- 不修改 Worker binding、secret 或环境变量。
- 不修改 `one-autojs6`。

## 5. 计划验证

1. 记录修改前服务端 TypeScript 诊断；若 WSL 因 Windows 平台依赖无法执行，则使用 Windows Node/pnpm，并写入落地文档。
2. 运行 TikTok domain/application/service 定向 Vitest。
3. 运行原 async-task 定向测试，确认旧 API 和任务规则不变。
4. 运行服务端 TypeScript 诊断与构建。
5. 对变更文件执行 Prettier 和 ESLint。
6. 检查 `git diff --check`、UTF-8 无 BOM、LF、无新增 `any/as any`。
7. 按仓库规范最多执行五轮复盘；若复盘发现问题，先暂存再修正。

## 6. 验收标准

- 四种 TikTok v2 动作均可通过专用 API 下发。
- 新生成的 `publicationId` 同时出现在响应和手机任务参数中。
- `recover/status` 缺少原 ID 时在发布 MQTT 前失败。
- 非法素材、路径、文案、策略、链接或未知字段在服务端被拒绝。
- 手机端私有安全策略不被服务端请求放宽。
- 现有 async-task HTTP/MQTT/DB 行为无回归。
