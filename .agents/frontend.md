# 前端开发规范指南 (Frontend Guidance)

本指南面向本项目前端应用 (`platform/apps/`) 与 UI 共享库 (`platform/packages/ui/`) 的开发规范与最佳实践。

---

## 1. 接口调用与契约驱动 CRUD 页面规范

- **标准与扩展 CRUD 页面优先使用顶层 JSON 契约 (`@hodor/contracts`)**：
  - **纯声明式 CRUD（零前端 TSX）**：在 `packages/contracts/src/resources/<app>/.../<resource>.json` 中定义契约并运行 `pnpm run sync:all` 后，各前端应用 `src/routes.tsx` 会通过 `@/routes/buildContractRoutes`（`platform/packages/ui/src/routes/buildContractRoutes.tsx`）自动懒加载挂载路由，内置通过 `postCrudEndpoint`（`@/api/crud`）调用 `/list`、`/add`、`/update`、`/delete`、`/deleteWithUndo` 与详情弹窗，**无需**为标准 CRUD 编写 `pages/**/index.tsx`、`TheFilter.tsx`、`TheTable.tsx`、`TheForm.tsx`、`constant.ts` 或重复 API 封装。
  - **带交互扩展的 CRUD（薄壳 `index.tsx` + `ContractCrudPage`）**：仅当页面需要额外抽屉/弹窗/工具栏按钮/富文本等复杂定制交互时，创建 `pages/<route>/index.tsx` 覆盖自动路由，组合 `ContractCrudPage` 与 `CrudExtensions`（`toolbarActions`、`rowActions`、`dialogs`、`customCells`、`customFormFields`、`formHeader`/`formFooter`、`afterOpen`/`beforeSubmitAsync`/`afterAdd`、`listAdapter`/`mutationAdapter`）。
- **自定义接口调用必须保持独立解耦封装**：在非 `ContractCrudPage` 标准路径调用定制 HTTP 接口（如抽屉子面板、特殊动作、非 CRUD 业务页）时，严禁在页面或组件内直接内联调用底层请求实例；必须统一在 `platform/packages/ui/src/api/[domain]/` 下封装并导出的函数（如 `verifyFn`、`runTestFn`、`sendBatchFn`）。
- **禁止使用 `any` 类型或 `as any` 强转**：定制接口封装与响应类型必须直接从离线生成的 OpenAPI 类型文件 (`@/types/openapi.d.ts`) 或 `AxiosConfig<'/path', 'method'>` 泛型推导。
- **禁止在业务组件中硬编码请求参数上下文**：发送 API 请求时（如 `tenantId` 或 `userId`）严禁硬编码，必须通过状态、Props、契约 `api.fixedParams` / `contextParams` 传入或由后端 Token 解析。

---

## 2. 前端路由挂载与扁平化设计

- 物理页面文件放置于各 App 的 `src/pages/**/index.tsx`，由 `src/routes.tsx` 通过 `import.meta.glob` 自动加载。
- 声明式契约路由由 `buildContractRoutes(app, physicalRoutes)` 从 `@hodor/contracts/manifest` 自动装配；若同路由下已存在物理 `pages/.../index.tsx`，**自动优先保留物理页面**以免路由冲突。
- 各应用包名与作用域分别为：`@hodor/web-admin` (`admin`)、`@hodor/web-enterprise` (`enterprise`)、`@hodor/web-personal` (`personal`)。

---

## 3. 国际化多语言翻译机制

### 基本原则

- 严禁在页面组件中针对 `t()` 翻译函数使用备用文字（例如 `t('key') || '默认文本'`）。
- 始终保持 `t('key')` 的干净输出，若缺少词条将直接展示键名，以防开发遗漏翻译，便于在运行时及时补全。

### 文案存放位置（新规范）

采用**双层文案加载机制**，前端本地 TS 文件为首选，数据库保留热修复能力：

| 类型 | 存放位置 | 说明 |
|------|---------|------|
| 跨 App 公共文案（通用动词/状态/组件/侧边栏/认证） | `platform/packages/ui/src/locales/[lang]/` | 由 `useLoadTranslations` 启动时同步写入 |
| App 专属页面文案 | `platform/apps/[app]/src/locales/[lang]/` | 由各 App.tsx 模块加载时同步 merge |
| 后端报错文案、运营需动态修改的文案 | 数据库（通过后台「翻译管理」维护） | 接口 merge 覆盖本地，优先级最高 |

> **严禁**将新功能的前端页面文案写入 `server/packages/core/src/db/translation/shared.ts` 或各模块 `translation.ts`。

### 新增文案流程

1. 在 `platform/packages/ui/src/locales/zh-CN/` 对应的 namespace 文件中添加（如 `common.ts`、`components.ts`）
2. 若是 App 专属文案，在 `platform/apps/[app]/src/locales/zh-CN/` 下对应文件中添加
3. 同步在 `en-US/` 对应文件添加英文翻译
4. 无需重启后端，立即生效

### 通用词汇复用（防止重复定义）

**新增文案前，必须先检查以下位置是否已有可复用的 key：**

- `platform/packages/ui/src/locales/zh-CN/common.ts`（通用动词：取消/确定/保存/删除…）
- `platform/packages/ui/src/locales/zh-CN/components.ts`（表格/列名/弹窗/状态…）

常见通用词对应 key：

| 词汇 | key |
|------|-----|
| 取消/确定/保存/提交 | `common.cancel` / `common.confirm` / `common.save` / `common.submit` |
| 编辑/删除/查看/新增 | `common.edit` / `common.delete` / `common.view` / `common.add` |
| 操作（表格列） | `table.actions` |
| 创建人/更新时间 | `column.creatorName` / `column.updateTime` |
| 启用/禁用 | `status.enabled` / `status.disabled` |

### 后端热修复

若需要在**不发布前端**的情况下修改已上线的文案：

1. 进入后台「翻译管理」
2. 找到对应 `tKey`，修改 `tValue`，将 `application` 设为 `frontend`，`isEnabled` 设为 `true`
3. 用户刷新页面后自动生效（接口数据优先级高于本地文案）



---

## 4. 离线全栈同步 (`pnpm run sync:all`) 与 OpenAPI 类型

无需启动本地后端服务；每当新增或修改契约 JSON、后端路由或权限种子后，在**仓库根目录**执行一键离线同步即可完成契约构建、`BusinessKey`、`usePermission.ts`、`openapi.d.ts` 及四维契约校验：

```bash
pnpm run sync:all
```

如需单独重新离线导出 `platform/packages/ui/src/types/openapi.d.ts`，可在仓库根目录运行：`pnpm run sync:openapi`。

---

## 5. 页面权限常量生成 (`generate-constants.js`)

仅保留手动引用 `./constant` 或 `../constant` 的非契约定制页面目录才需要 `constant.ts`（`ContractCrudPage` 纯 JSON 或薄壳页面应直接通过契约自动派生或从 `@/hooks/usePermission` 导入 `permissions`，**不要**再保留冗余 `constant.ts`）。

**脚本路径**: `platform/scripts/generate-constants.js`

**执行命令**（仓库根目录或 `platform/` 目录下）：

```bash
node platform/scripts/generate-constants.js
```

**生成规则**：

- 脚本遍历 `platform/apps/[app]/src/pages/` 子目录时，会先检测目录及其 `components/` 下是否存在 `./constant` 或 `../constant` 的导入语句；**无引用的契约页目录与中间分组目录将被跳过**，不会重新生成孤儿 `constant.ts`。
- 若目录实际引用了 `constant` 且 `usePermission.ts` 中存在对应键结构，则更新 `THIS_PERMISSION = permissions.xxx.yyy`；否则仅生成前缀常量。
- **排除目录**（`home`、`login`、`me`）：删除已有的 `constant.ts` 并跳过。

**何时需要重新执行**：

1. 在 `usePermission.ts` 中新增/变更了权限条目，且存在引用 `constant.ts` 的非契约页面。
2. 新建或改造了直接引用 `./constant` / `../constant` 的定制页面。

---

## 6. 时间戳渲染规范

所有前端 React 组件在渲染数据库返回的时间戳时，必须统一使用 `dayjs` 库进行格式化（如 `dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss")`），严禁使用原生的 `new Date().toLocaleString()` 进行处理。

> **注意**：如果后端的 `create_time_utc` 等字段在数据库层面是毫秒级存储的，则直接传入 `dayjs(timestamp)`，不需要在前端乘以 1000。

---

## 7. 亮色/暗色模式主题适配规范

在开发前端 UI 组件需要做明暗模式（Light/Dark Mode）适配时，**严禁硬编码 `rgba` 颜色**，也**避免使用 `theme.palette.mode === 'dark' ? A : B` 的三元条件判断逻辑**。
请务必遵循 MUI 的最佳实践，使用预置的**语义化色板（Semantic Palette）**，这些色板已在底层绑定了明暗逻辑，能自动翻转颜色：

- **背景/容器**：使用 `background.paper` 或 `background.default`。
- **边框/分割线**：使用 `divider`，能自动在浅色与深色模式下呈现极佳的边界感，替代手写的 `boxShadow`。
- **状态颜色（悬停/禁用等）**：使用 `action.active`、`action.hover`、`action.disabled` 等。例如自定义滚动条时，可使用 `action.disabled` 作为滑块基础色，`action.active` 作为悬停色。

---

## 8. 前端 HTTP 接口异常处理 try-catch 规范

由于项目在全局 HTTP 请求适配层（`platform/packages/ui/src/api/config.ts`）中已统一下发拦截与全局错误提示（自动弹出 `showSnackbar({ message, type: 'error' })`），页面与组件发起接口调用时必须遵循以下规范：

- **`catch` 语法简化**：接口调用的 `try ... catch` 结构中，`catch` 统一简化为 `catch {}`。
- **严禁控制台错误输出**：严禁在 `catch` 块中写入 `console.error(...)` / `console.log(...)` 调试打印。
- **严禁重复错误弹框**：严禁在 `catch` 块中调用 `showSnackbar` 重复展示错误提示。
- **孤立翻译清理**：若移除 `catch` 块的错误弹框导致某些失败提示文案不再被任何地方引用，必须同步清理相应的多语言词条。
- **`finally` 作用域约束**：`finally` 块仅用于状态解构与变量恢复（如 `setLoading(false)` / `setVerifyingId(null)`）。若无需恢复操作，无需编写空 `finally` 块。

