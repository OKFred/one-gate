# 全局开发规范与架构说明 (Global Guidance)

## 1. 核心架构与 Monorepo 包职责

项目采用根目录统一 **PNPM Workspace Monorepo**（`pnpm-workspace.yaml`）：

- **顶层共享契约** (`packages/contracts/`, `@hodor/contracts`)：CRUD 单点真相 JSON 契约，经生成产物向后端导出 `compileBackendSchemas`，向前端导出路由清单（`@hodor/contracts/manifest`）与视图投影（`@hodor/contracts/frontend`）。
- **后端领域包与宿主**：`@hodor/core`（数据库连接、中间件、`createCrudApis`、`ServiceRegistry`）、`@hodor/admin`、`@hodor/enterprise`、`@hodor/personal`，由 `server/apps/server`（`@hodor/server`）承载 Node.js / Cloudflare Workers（D1 + PostgreSQL）双运行时。
- **前端公共库与应用**：`@hodor/ui`（`platform/packages/ui`，别名 `@/`，含 `ContractCrudPage`、`buildContractRoutes`）、`@hodor/web-admin`、`@hodor/web-enterprise`、`@hodor/web-personal`（后两者通过 Module Federation 挂载进 `admin` 主应用）。

## 2. 常用全局命令

- `pnpm run verify:fast`：快速门禁（契约校验 + 功能地图新鲜度 + 架构守卫 + 前后端 Lint + 契约与类型检查）
- `pnpm run verify`：完整本地验证（在 `verify:fast` 之上追加 `contracts` / Node / 服务端与前端构建）
- `pnpm run sync:all`：离线全栈同步（契约生成与构建 + `BusinessKey` + 权限码 + `openapi.d.ts` + 契约校验 + 更新 `docs/feature-map.md`）

## 3. TypeScript 严格类型与注释原则

- **严禁新增 `any` / `as any`**：前端与契约全零容忍；后端新文件与 clean 文件由 ESLint 直接报 `error`，其余 34 个历史文件受 [scripts/any-ratchet-baseline.json](../scripts/any-ratchet-baseline.json)「只减不增」棘轮锁定。
- **高信噪比注释原则**：
  - 公共函数/模块契约可使用简洁 JSDoc；行内注释只写非显而易见的**原因**、运行时约束或并发/安全不变量。
  - **禁止**复述代码本身在做什么、保留注释掉的死代码，或用大段注释为临时变通（workaround）开脱；优先通过抽取清晰函数名、类型或测试来表达意图。
