# 后端开发规范指南 (Backend Guidance)

面向 `server/packages/` 与 `server/apps/server/`（同时遵守 `server/AGENTS.md` 中的 Cloudflare Workers 准则）。

## 1. 数据模型与默认值边界

- **Schema 严禁写业务默认值**：Drizzle `model.ts` / `schema*.ts` 中禁止使用 `.default(...)`（仅允许 `createTimeUtc` 使用 `getCurrentTimestampUtcSql()` 或 `pgTimestampUtcSql()`），由 `pnpm run check:architecture` 自动校验。
- **默认值分层**：交互类默认项放在契约 JSON / 前端表单初始值；系统字段与计数列（如 `status`、`permissionCount: 0`）必须在 `service.ts` 新增逻辑中显式赋值。
- **双库模型与 DDL**：修改表结构后需同步更新并生成 SQLite（D1）及 PostgreSQL DDL/迁移产物（`pnpm --dir server run db:generate` 与对应业务生成器），严禁手改生成后的 SQL 契约产物。

## 2. 路由装配、POST 约定与契约驱动

- **CRUD 优先使用共享契约**：在 `packages/contracts/src/resources/` 定义契约并在 `service.ts` 引入 `@hodor/contracts/resources` 的 `*BackendSchemas`，结合 `createCrudApis` 与 `buildPagedListResult` 自动装配标准端点。
- **全部业务接口只用 `POST`**：`pathInfo.method` 必须为 `"post"`，确保统一经 JSON Body 解析与 OpenAPI/权限校验（由 `pnpm run check:architecture` 自动校验）。
- **禁止在 `service.ts` 硬编码字段 Schema**：非契约定制接口的请求/响应 Schema 定义在 `model.ts` 并在 `service.ts` 引用。
- **导出与挂载解耦**：`service.ts` 默认导出纯 `Record<string, API>` 对象（如 `export default createCrudApis(...)`），在同级 `index.ts` 通过 `encapsulation(service, "...")` 挂载并汇入子包 `index.ts`。

## 3. 跨包解耦 (`ServiceRegistry`)

- `admin` / `enterprise` / `personal` 之间严禁直接 `import` 其它业务包私有源码，必须通过 `@hodor/<domain>/common/registry.js` 注册中心暴露与调用（由 `pnpm run check:architecture` 硬拦截）。

## 4. 变更同步与测试

- 修改后端路由、权限种子（`permissions.ts` / `initMenu.ts`）或契约后，执行 `pnpm run sync:all` 同步全栈类型与功能地图；如需刷新本地 SQLite，执行 `pnpm --dir server run db:init node`。
- 新增接口或保留策略改动应补充对应 Node 单测或 `*.workers.spec.ts` / `*.postgresql.spec.ts` 回归测试。
