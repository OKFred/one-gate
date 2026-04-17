# 全栈开发参考指南 (AI 助手版)

本指南旨在为 AI 助手提供在本项目中开发新功能（接口 + 页面）的标准流程和规范。

## 1. 核心技术栈

- **后端**: Hono (Web 框架), Drizzle ORM (数据库), JSON Schema (参数校验), SQLite.
- **前端**: React 18, Vite, Material UI (MUI), Dayjs, Axios.

---

## 2. 后端开发流程 (API)

### Step 2.1: 定义数据库 SQL

在 `server/src/db/sql/` 目录下创建 `[table_name].sql`。

- 使用 `INTEGER PRIMARY KEY AUTOINCREMENT` 作为 ID。
- 必须包含审计字段：`creator_id`, `updater_id`, `create_time_utc`, `update_time_utc`。

### Step 2.2: 定义模型 (Model)

在 `server/src/api/[module]/[sub_module]/model.ts` 中：

- 使用 Drizzle 定义 `table`。
- 定义 `PO`, `DTO`, `VO` 类型。

### Step 2.3: 实现服务 (Service)

在 `server/src/api/[module]/[sub_module]/service.ts` 中：

- 实现 CRUD 函数。
- 列表查询应支持 `pageNo`, `pageSize`, `orderBy`, `descend` 及关键词过滤。
- 使用 `wrapHono` 封装 API。

### Step 2.4: 注册路由 (Router)

- 在 `server/src/api/[module]/index.ts` 中合并子模块路由。
- 在 `server/src/api/index.ts` 中注册主模块路由。

---

## 3. 数据库初始化配置

每增加一个新模块，必须更新以下文件以支持自动化初始化：

1. **`server/src/db/initTable.ts`**: 在 `TABLES` 数组中添加新表名。
2. **`server/src/db/initMenu.ts`**: 添加侧边栏菜单配置（注意分配唯一的 ID）。
3. **`server/src/db/initPermissions.ts`**: 添加 `api` 和 `button` 类型的权限码。
4. **`server/src/db/initTranslation.ts`**: 添加菜单、业务类型及页面组件的多语言翻译。
5. **`server/src/types/business.d.ts`**: 扩展 `BusinessKey` 类型。

运行初始化命令：

```bash
cd server && pnpm run db:init node
```

---

## 4. 前端开发流程 (Page)

### Step 4.1: 定义 API 客户端

在 `platform/src/api/[module]/[sub_module].ts` 中定义 Axios 调用函数，通常包括 `listFn`, `addFn`, `updateFn`, `deleteFn`, `getFn`。

### Step 4.2: 定义权限码 (Permissions)

在 `platform/src/hooks/usePermission.ts` 中添加对应的权限常量，格式通常为 `module.sub_module:action`。

### Step 4.3: 构建组件结构

页面目录：`platform/src/pages/[module]/[sub_module]/`

- **`index.tsx`**: 页面入口，使用 `PageLayout`。
- **`components/TheTable.tsx`**: 响应式列表，在 PC 端使用表格，移动端使用卡片流。
- **`components/TheForm.tsx`**: 新增和编辑的弹窗。
- **`components/TheFilter.tsx`**: 搜索和筛选区域。
- **`components/TheActionButtons.tsx`**: 行操作按钮，需绑定权限控制。

### Step 4.4: 响应式规范

- 使用 `@/components/Responsive/index` 下的 `ResponsiveList`, `ResponsiveButton` 等组件。
- 利用 `useResponsive` Hook 处理移动端适配（如全屏 Dialog）。

---

## 5. 命名规范

- **文件**: 模块名使用小写（如 `attendance`），组件使用大驼峰并加 `The` 前缀（如 `TheTable.tsx`）。
- **字段**: 数据库采用下划线 (`create_time_utc`)，JS/TS 采用小驼峰 (`createTimeUtc`)。
- **多语言**: 翻译键采用点分隔（如 `sidebar.menu.enterprise.attendance`）。

---

## 6. 开发建议

- **代码复用**: 优先参考 `i18n/language` 或 `system/user` 模块的实现模式。
- **安全性**: 所有写操作 API 必须校验权限，读操作尽可能通过子查询或 Join 丰富 VO 数据。
- **交互**: 操作成功后必须调用 `tableRef.current?.refresh()` 刷新数据。
