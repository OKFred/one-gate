# 全局开发规范与架构说明 (Global Guidance)

本文件定义项目的全局架构划分、技术栈职责及通用 TypeScript 类型控制规范。

---

## 1. 核心技术栈与 Monorepo 包职责

项目在仓库根目录下采用 **统一 PNPM Workspace Monorepo**（配置见根目录 `pnpm-workspace.yaml` 与 `package.json`），将共享契约层、后端领域服务与前端微前端应用纳入同一工作区：

- **顶层共享契约包** (`packages/contracts/`):
  - `@hodor/contracts`: 顶层单点真相共享契约包。每个 CRUD 资源仅在 `packages/contracts/src/resources/<app>/.../<resource>.json` 编写一份声明式 JSON 契约，经 `pnpm --filter @hodor/contracts build` 编译生成到 `src/generated/`（不入 Git，由构建脚本产出），同步向后端导出 JSON Schema 集合（`compileBackendSchemas`）并向前端导出路由清单（`@hodor/contracts/manifest`）与投影配置（`@hodor/contracts/frontend`）。
  - 验证/同步命令（仓库根目录）：`pnpm run sync:all`、`pnpm run contracts:generate`、`pnpm run contracts:build`、`pnpm run contracts:check`、`pnpm --filter @hodor/contracts test`。
- **后端包** (`server/packages/` 与 `server/apps/`):
  - `@hodor/core` (`server/packages/core`): 核心公共组件（数据库连接、中间件、`createCrudApis` / `buildPagedListResult`、认证拦截、日志与工具函数）。
  - `@hodor/admin` (`server/packages/admin`): 管理后台服务（系统用户、角色权限、菜单、地区与国际化、Swarm 容器配置、移动端管理等）。
  - `@hodor/enterprise` (`server/packages/enterprise`): 企业应用后台服务（组织架构、考勤、工作流任务驱动、资产管理等）。
  - `@hodor/personal` (`server/packages/personal`): 个人应用后台服务（用户个人中心、偏好配置、关联档案与个人资产维护）。
  - `@hodor/server` (`server/apps/server`): 后端宿主应用（Node.js / Cloudflare Workers 双运行时入口、D1/PostgreSQL 迁移与 OpenAPI 导出）。
- **前端应用与 UI 共享包** (`platform/packages/` 与 `platform/apps/`):
  - `@hodor/ui` (`platform/packages/ui`, 别名 `@/`): UI 公共组件库（含契约渲染引擎 `ContractCrudPage`、表单验证、HTTP 请求适配层与自动路由装配器 `buildContractRoutes`）。
  - `@hodor/web-admin` (`platform/apps/admin`): 系统管理端 React 应用（端口 5173）。
  - `@hodor/web-enterprise` (`platform/apps/enterprise`): 企业协作端 React 应用（端口 5174）。
  - `@hodor/web-personal` (`platform/apps/personal`): 个人中心 React 应用（端口 5175）。

---

## 2. 全局 TypeScript 开发规范 (严格禁止 any)

- **绝对禁止使用 `any`**：无论是在前端、后端还是共享契约工具链中，任何情况下都不允许使用 `any` 类型或 `as any` 强制类型转换。
- **强制类型推导与校验**：所有变量、函数参数、返回值以及接口数据，都必须具有明确的类型定义或通过类型系统（如 `@hodor/contracts/resources` 生成的 `const` 契约 Schema、Drizzle Schema、`json-schema-to-ts`、`FromSchema` 或 `openapi-typescript` 生成的 `@/types/openapi.d.ts`）进行安全推导，确保类型链完整。
