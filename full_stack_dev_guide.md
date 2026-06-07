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

1. **`server/src/db/initMenu.ts`**: 添加侧边栏菜单配置（注意分配唯一的 ID）。
2. **`server/src/db/initPermissions.ts`**: 添加 `api` 和 `button` 类型的权限码。
3. **`server/src/db/initTranslation.ts`**: 添加菜单、业务类型及页面组件的多语言翻译。
4. **`server/src/types/business.d.ts`**: 扩展 `BusinessKey` 类型。

运行初始化命令：

```bash
cd server && pnpm run db:init node
```

---

## 4. 前端开发流程 (Page)

### Step 4.0: 定义 TypeScript 类型

在 `platform/src/api/[module]/type.d.ts` 中根据 API 函数自动推导类型：

```typescript
import * as ModuleAPI from './module';

export type ListReq = NonNullable<Parameters<typeof ModuleAPI.listFn>[0]['data']>;
export type ListRes = Awaited<ReturnType<typeof ModuleAPI.listFn>>['data']['data'];
export type AddReq = NonNullable<Parameters<typeof ModuleAPI.addFn>[0]['data']>;
export type UpdateReq = NonNullable<Parameters<typeof ModuleAPI.updateFn>[0]['data']>;
export type GetRes = Awaited<ReturnType<typeof ModuleAPI.getFn>>['data']['data'];

/** 业务对象类型 */
export type [Module]Obj = ListRes['list'][number];
```

### Step 4.1: 定义 API 客户端

在 `platform/src/api/[module]/[sub_module].ts` 中定义 Axios 调用函数，通常包括 `listFn`, `addFn`, `updateFn`, `deleteFn`, `getFn`。

### Step 4.2: 定义权限码 (Permissions)

在 `platform/src/hooks/usePermission.ts` 中添加对应的权限常量，格式通常为 `module.sub_module:action`。

### Step 4.3: 构建组件结构（增删改查页面的快速构建）

页面目录：`platform/src/pages/[module]/[sub_module]/`

对于增删改查页面，根据复杂度的不同，分为**声明式低代码极速构建（推荐）**与**传统多组件独立构建**两种方式。

#### 模式 A：声明式低代码极速构建 (基于 SchemaCrudPage 底座)

当页面为典型的列表查询、表单增改、详情及删除时，**必须优先选用声明式底座进行快速构建**。这能让你的页面代码从 5 个组件文件减少到仅 1 至 2 个，并且原生享有完善的响应式和 loading 交互。

1. **一阶：纯声明式极速构建 (0 冗余组件)**
   - 整个页面仅需一个 `index.tsx` 文件。
   - 在 `index.tsx` 中定义 `SchemaCrudConfig` 配置对象，直接挂载 `<SchemaCrudPage config={config} />`。
   - 过滤项、表格列表字段、简单新增/编辑表单的 schema 都通过配置式定义。
2. **二阶：声明式 + 局部自定义表单 (单组件扩展)**
   - 页面由 `index.tsx` 和自定义表单组件 `components/TheForm.tsx` 组成。
   - 适用于表单有特殊交互、需要异步加载下拉列表数据（如用户列表）、或需要对提交数据进行转换（如时间戳转换）的场景。
   - 利用 `form.afterOpen` 与 `form.beforeSubmit` 等生命周期钩子，以及 `form.renderForm` 传入自定义表单渲染逻辑。

#### 模式 B：传统多组件独立构建 (高定制树形/复杂图表等)

仅当页面的交互逻辑与 CRUD 存在底层冲突（如需要支持折叠树拖拽菜单、复杂的拓扑交互图表）时，才使用传统的多组件构建：

- **`index.tsx`**: 页面入口，使用 `PageLayout`。
- **`components/TheTable.tsx`**: 响应式列表展示。
- **`components/TheForm.tsx`**: 表单编辑/新增 Dialog。
- **`components/TheFilter.tsx`**: 筛选区域。
- **`components/TheActionButtons.tsx`**: 行操作按钮，绑定鉴权。

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

---

## 7. TypeScript & 类型规范

为了确保系统的稳定性和可维护性，必须遵循以下类型规范：

### 7.1 严禁使用 `any`

- 在组件、State、Props 和 API 调用中禁止出现 `any`。
- 如果类型复杂或来自第三方库，使用 `unknown` 或具体的工具类型（如 `Parameters` / `ReturnType`）进行推导。

### 7.2 显式类型转换 (Explicit Casting)

- 在提交表单 Payload 时，应显式转换为 API 定义的请求类型：
  ```typescript
  const payload = { ...form } as AddReq;
  await API.addFn({ data: payload });
  ```

### 7.3 MUI 组件样式属性类型

- 当需要定义 MUI 组件属性（如 `color`, `variant`）的变量时，应使用其定义的字面量类型，而非 `string`：
  ```typescript
  const color: Parameters<typeof Chip>[0]["color"] = "success";
  ```

### 7.4 命名约定

- **接口请求**: `[Action][Module]Req` (例如 `ListAttendanceReq`).
- **接口响应**: `[Action][Module]Res` (例如 `ListAttendanceRes`).
- **实体对象**: `[Module]Obj` (代表列表中的单行数据，例如 `AttendanceObj`).

---

## 8. 前后端权限码统一规范

为了保证系统鉴权的严密性，前后端的权限控制码（Permission Code）必须遵循**绝对的统一性与对齐原则**：

### 8.1 权限码命名规则

权限码统一采用点和冒号分隔的层级命名法：`[module].[sub_module]:[action]`。
例如：

- `system.user:add` (系统管理-用户管理-新增)
- `enterprise.attendance:export` (企业管理-考勤管理-导出)
- `maintenance.cache:delete` (系统维护-缓存管理-删除)

### 8.2 后端权限码与鉴权

1. **数据源初始化**：
   在后端初始化文件 `server/src/db/initPermissions.ts` 中，必须声明所有有效的 `api` 和 `button` 类型的权限码，确保在数据库中被自动初始化和入库。
2. **中间件拦截强校验**：
   在服务的路由层或控制器层，对写操作（POST、PUT、DELETE）和敏感的读操作进行统一的鉴权中间件过滤（如引用对应的权限码常量进行匹配校验），防止越权行为。

### 8.3 前端权限控制与对齐

1. **常量定义同步**：
   在前端 `platform/src/hooks/usePermission.ts` 的 `permissions` 对象或对应的业务常量大对象中，必须声明与后端 `initPermissions.ts` **完全一致、字母完全对齐**的权限码常量：
   ```typescript
   export const MAINTENANCE = {
     CACHE: {
       VIEW: "maintenance.cache:view",
       DELETE: "maintenance.cache:delete",
     },
   };
   ```
2. **交互按钮绑定**：
   在渲染表格操作列按钮（如 `table.actions` 中的 `permissionCodes`）、页面通用按钮、或定制组件时，必须绑定该权限码常量。底座和鉴权 Hook 将根据当前用户的实际拥有的权限列表自动对按钮进行隐藏或禁用，从而做到全链路的安全协同。
