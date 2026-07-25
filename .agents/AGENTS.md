# 开发规范总揽目录 (Developer Guidance Catalog)

本项目已针对前端、后端及全局开发规范进行了模块化拆分与重构。请根据开发场景查阅以下对应的详细规范文档：

- [全局开发规范与架构说明](https://github.com/OKFred/one-gate/blob/main/.agents/global.md) (`./global.md`): 包含 Monorepo 模块职责划分（`server/packages/` 与 `platform/apps/`）及全局 TypeScript 严格类型约束（全局严禁 `any`）。
- [后端开发规范指南](https://github.com/OKFred/one-gate/blob/main/.agents/backend.md) (`./backend.md`): 包含 Drizzle Schema 模型定义、数据表默认值禁令与分层治理策略、DDL生成与迁移流程、Repository/Service 规范（强制 POST 请求与接口定义归集）、跨包 Service Registry 及全局数据库种子初始化。
- [前端开发规范指南](https://github.com/OKFred/one-gate/blob/main/.agents/frontend.md) (`./frontend.md`): 包含 API 接口解耦封装与 OpenAPI 类型同步、微前端路由扁平化、i18n 多语言翻译规范、权限常量自动生成、时间戳格式化及 MUI 语义化主题适配规范。
