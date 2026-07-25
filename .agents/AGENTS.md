# 开发规范总揽目录 (Developer Guidance Catalog)

本项目已针对前端、后端及全局开发规范进行了模块化拆分与重构。请根据开发场景查阅以下对应的详细规范文档：

- [全局开发规范与架构说明](https://github.com/OKFred/one-gate/blob/main/.agents/global.md) (`./global.md`): 包含 Monorepo 模块职责划分（`server/packages/` 与 `platform/apps/`）、全局 TypeScript 严格类型约束（全局严禁 `any`）以及 AI 修改多次复盘与规范修改约束。
- [后端开发规范指南](https://github.com/OKFred/one-gate/blob/main/.agents/backend.md) (`./backend.md`): 包含 Drizzle Schema 模型定义、数据表默认值禁令与分层治理策略、DDL生成与迁移流程、Repository/Service 规范（强制 POST 请求与接口定义归集）、跨包 Service Registry 及全局数据库种子初始化。
- [前端开发规范指南](https://github.com/OKFred/one-gate/blob/main/.agents/frontend.md) (`./frontend.md`): 包含 API 接口解耦封装与 OpenAPI 类型同步、微前端路由扁平化、i18n 多语言翻译规范、权限常量自动生成、时间戳格式化及 MUI 语义化主题适配规范。

---

## AI 代码修改多次复盘与规范约束准则

1. **代码修改后的多次复盘机制 (Review & Stage Loop)**：
   - 每次 AI 对话中涉及文件/代码修改后，必须对照 `AGENTS.md` 及其引用的开发规范，对新增或调整的代码进行多次复盘校验。

   - 若发现改动与规范有出入：
     - ① 先将现有改动进行 stage 暂存（如 `git add`）。
     - ② 依据规范重新修正代码。
     - ③ 再次对照规范校验改动。
     - ④ 上述流程最多反复 **5 次**，若已完全符合规范则提早结束循环。
2. **规范修改限制原则 (Specification Editing Restrictions)**：
   - 除非出现以下两种情况之一，否则一律不允许修改规范文件（包括 `.agents/` 目录下的所有文件）：
     - ① 开发者显式说明/指示要求修改规范；
     - ② 开发者的业务要求与现有规范存在出入，需要调整规范。
   - 除上述情况外，禁止擅自改动、篡改或削弱规范。

