# 前端开发规范指南 (Frontend Guidance)

本指南面向本项目前端应用 (`platform/apps/`) 与 UI 共享库 (`platform/packages/ui/`) 的开发规范与最佳实践。

---

## 1. 新增与独立封装 API 请求定义

- **前端所有 HTTP 接口调用必须保持独立解耦封装**：严禁在 React 页面组件（如 `pages/` 内的文件）中直接手写或调用内联 `axiosPlus`。
- 所有接口请求必须统一在 `platform/packages/ui/src/api/[domain]/` 目录下按业务模块声明独立的 `.ts` 文件（例如 `admin/ai/config.ts`、`enterprise/mail/edm.ts`、`personal/mail/preference.ts`）。
- 接口封装函数名统一按照规范命名（如 `listFn`、`listAllFn`、`getFn`、`addFn`、`updateFn`、`deleteFn`、`sendBatchFn` 等），内部采用 `axiosPlus` 适配请求，API 路径前缀必须契合后端（例如：`/api/v1/personal/profile/list`）。
- **禁止使用 `any` 类型或 `as any` 强转**：接口请求与响应的数据类型必须直接从后端自动生成的 OpenAPI 类型文件 (`@/types/openapi.d.ts`) 或使用 `AxiosConfig<'/path', 'method'>` 泛型直接进行类型安全推导，严禁使用 `any` 绕过 TS 校验。
- **禁止在业务组件中硬编码请求参数上下文**：发送 API 请求时（特别如 `tenantId: 1` 或特定 `userId` 等标识）严禁硬编码。这些参数必须通过全局状态、组件 Props 传入，或依赖后端 Token 隐式解析。

---

## 2. 前端路由挂载与扁平化设计

- 前端物理页面路径应当**扁平化**，直接放置于 `pages/` 根目录下，避免繁琐的二级嵌套。
- 路由挂载在各自独立应用的 `src/routes.tsx` 中，利用 `import.meta.glob` 自动加载。
- 页面权限标识 `PREFIX_LV1` 分别为：`admin`、`enterprise` 或 `personal`。

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

## 4. 同步 OpenAPI 接口类型

若后端路由有增减，在后端启动状态下，执行以下命令同步前端类型：

```bash
npx openapi-typescript http://localhost:8787/doc.json --output platform/packages/ui/src/types/openapi.d.ts
```

---

## 5. 页面权限常量自动生成 (`generate-constants.js`)

每个页面目录下的 `constant.ts` 均由脚本自动生成，**不要手动编辑**。

**脚本路径**: `platform/scripts/generate-constants.js`

**执行命令**（在 `platform/` 目录下）：

```bash
node ./scripts/generate-constants.js
```

**生成规则**：

- 脚本会扫描 `platform/apps/[app]/src/pages/` 下的所有子目录，对照 `packages/ui/src/hooks/usePermission.ts` 中 `permissions` 对象的实际键结构，判断该页面目录是否有对应的权限条目。
- **有权限条目**：生成 `THIS_PERMISSION = permissions.xxx.yyy`（完整类型安全，无 `as any`）。
- **无权限条目**（如 `mail/send`、`maintenance/openapi`）：只生成前缀常量，不生成 `THIS_PERMISSION`。
- **排除目录**（`home`、`login`、`me`）：删除已有的 `constant.ts` 并跳过，因为这些页面与权限系统无关。

**何时需要重新执行**：

1. 在 `usePermission.ts` 中新增或删除权限条目后。
2. 在 `pages/` 下新增了页面子目录后。
3. 修改了 `EXCLUDED_DIRS` 排除列表后。

> **注意**：`usePermission.ts` 由 `server/scripts/sync-permissions.ts` 自动生成，不要手动编辑。因此正确的链式操作为：
> 修改 `initPermissions.ts` → 执行 `pnpm run db:init node` → 执行 `node ./scripts/generate-constants.js`。

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

