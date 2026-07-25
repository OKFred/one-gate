# 全局开发规范与架构说明 (Global Guidance)

本文件定义项目的全局架构划分、技术栈职责及通用 TypeScript 类型控制规范。

---

## 1. 核心技术栈与模块职责

项目结构划分为**后端微服务单体集控**（基于 Lerna/PNPM Workspace 的 Monorepo）与**前端微前端联邦应用**。

- **后端包** (`server/packages/`):
  - `@hodor/core`: 核心公共组件（数据库连接、中间件、认证拦截、日志与工具函数）。
  - `@hodor/admin`: 管理后台服务（系统用户、角色权限、菜单、地区与国际化、Swarm容器配置等）。
  - `@hodor/enterprise`: 企业应用后台服务（组织架构、考勤、工作流任务驱动等）。
  - `@hodor/personal`: 个人应用后台服务（用户个人中心、关联档案维护）。
- **前端应用** (`platform/apps/`):
  - `@hodor/admin`: 系统管理端 React APP（端口 5173）。
  - `@hodor/enterprise`: 企业协作端 React APP（端口 5174）。
  - `@hodor/personal`: 个人中心 React APP（端口 5175）。
  - 所有前端应用共享 `@hodor/ui`（UI公共组件库、HTTP请求适配层与通用上下文）。

---

## 2. 全局 TypeScript 开发规范 (严格禁止 any)

- **绝对禁止使用 `any`**：无论是在前端还是后端代码中，任何情况下都不允许使用 `any` 类型或 `as any` 强制类型转换。
- **强制类型推导与校验**：所有变量、函数参数、返回值以及接口数据，都必须具有明确的类型定义或通过类型系统（如 Drizzle Schema、Zod 或 OpenAPI 生成的类型）进行安全的推导，确保类型链的完整性。
