# 前端开发规范指南 (Frontend Guidance)

面向 `platform/apps/`（`@hodor/web-admin` / `@hodor/web-enterprise` / `@hodor/web-personal`）与 `platform/packages/ui/`（`@hodor/ui`，别名 `@/`）。

## 1. 契约 CRUD 页面与定制开发

- **纯 JSON 声明式 CRUD**：标准 CRUD 只需在 `packages/contracts/src/resources/<app>/.../<resource>.json` 声明契约并运行 `pnpm run sync:all`，各应用 `routes.tsx` 通过 `buildContractRoutes` 自动懒加载挂载，零手写页面与 API 封装。
- **扩展 CRUD（薄壳）**：仅当存在定制工具栏、额外抽屉/弹窗或定制字段交互时，创建 `pages/<route>/index.tsx` 组合 `<ContractCrudPage>` 与 `extensions`（保留物理页自动覆盖契约路由）。
- **定制请求封装**：非 `ContractCrudPage` 路径禁止在页面内内联底层 HTTP 实例，统一封装于 `platform/packages/ui/src/api/[domain]/`，响应类型从 `@/types/openapi.d.ts`（`pnpm run sync:openapi` 离线生成）推导。
- **禁止硬编码上下文参数**：租户/用户等上下文由状态、Props、契约 `fixedParams` / `contextParams` 或服务端 Token 解析，避免跨账号串数。

## 2. 国际化、时间与主题色板

- **严禁给 `t()` 加硬编码兜底文本**：缺失词条必须直接暴露键值并补全双语词典（由 ESLint 与 `contracts:check` 硬拦截）。
- **双层词典位置**：跨应用词条放 `platform/packages/ui/src/locales/{zh-CN,en-US}/`，App 专属词条放 `platform/apps/<app>/src/locales/{zh-CN,en-US}/`；禁止把新前端文案塞入后端 `initTranslation` 种子；数据库仅用于线上热修复覆盖。
- **时间戳统一使用 `dayjs`**：数据库毫秒戳直接传入 `dayjs(ts).format(...)`，禁止 `new Date().toLocaleString()`（由 ESLint 硬拦截）。
- **MUI 语义色板**：亮/暗模式适配优先使用 `background.paper`、`background.default`、`divider`、`action.*` 等语义 token，避免硬编码 `rgba` 或手写 `palette.mode` 分支。

## 3. 异常拦截与页面常量

- 全局拦截器（`@/api/config.ts`）已统一弹窗提示 HTTP 失败；组件内 `try ... catch {}` 直接留空 catch（禁止重复 `console.error` 或 `showSnackbar`），仅需在 `finally` 复位 loading 状态。
- 仅直接引入 `./constant` 的非契约页保留 `constant.ts`；若变更了引用该常量的页面权限，执行 `node platform/scripts/generate-constants.js`。
- **严禁使用原生弹窗**：`alert`、`confirm`、`prompt` 统一使用 `@/components/Notification` 的 `showConfirm` / `showSnackbar` 与受控 MUI Dialog（由 ESLint 与 `check:native-dialogs` 硬拦截）。
