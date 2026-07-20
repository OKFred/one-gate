# 全栈开发参考指南 (架构重构版)

本指南面向本项目在架构重构（包含 `admin`、`enterprise` 与 `personal` 模块独立化）后的最新规范，用于指导开发全新业务线与功能。

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

## 2. 后端开发规范 (以 Personal 模块为例)

### Step 2.1: 声明数据表模型 (Model)

在对应的业务包内创建领域文件夹，并定义 Drizzle Schema。例如在 `packages/personal/src/profile/model.ts` 中：

```typescript
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export const profileTable = sqliteTable("personal_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  realName: text("real_name").notNull(),
  gender: text("gender"),
  email: text("email"),
  phone: text("phone"),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});
```

### Step 2.2: 自动生成并归类 SQL DDL 文件

在定义好 Drizzle Schema 后，**无需手动编写 SQL 建表脚本**。直接在 `server` 根目录下运行 DDL 自动生成与归类工具：

```bash
pnpm run db:generate
```

该命令内部会调用 `drizzle-kit` 读取对应的 `model.ts` 并把解析出来的 DDL 语句拆分并全自动保存到 `@hodor/core` 包中的相应物理目录下（例如：`packages/core/src/db/sql/personal/personal_profile.sql`）。

### Step 2.3: 数据库增量迁移 (Migration)

在生产环境中，仅靠 DDL 文件重建数据表是危险的，必须使用 Migration 流程来处理 Schema 变更：

1. **生成 Migration 脚本**：修改 `model.ts` 后，运行以下命令生成增量迁移 SQL 脚本：
   ```bash
   npx drizzle-kit generate
   ```
2. **应用 Migration 变更**：在本地开发或部署时，执行推送到数据库：
   ```bash
   npx drizzle-kit push
   ```
或者使用 `drizzle-kit migrate` 通过 Node 脚本自动执行迁移逻辑以保证生产环境数据的完整性与安全。

### Step 2.4: 实现业务持久层 (Repository)

在 `repository.ts` 中完成低级别的数据库查询：

- 采用 Drizzle ORM 进行 DML 与单条/多条过滤。
- 列表查询须支持动态 `orderBy` 列排序与降序。

### Step 2.4: 业务控制层与 OpenAPI 描述 (Service & App)

在 `service.ts` 中描述并暴露 REST 端点：

- **所有业务接口设计必须且只能使用 POST 请求**：禁止使用 GET、PUT、DELETE 等其他方法，以保证高阶 `encapsulation` 中间件能正确且安全地从 JSON Body 中提取与校验数据。
- 统一使用 `encapsulation` (封装好的高阶 Hono 控制器适配器) 挂载 API。
- **禁止在 `service.ts` 中硬编码 API 请求或响应的字段定义 (Properties)**：为了保证类型与数据模型规范的集中管理，API 接口的 properties 字段属性必须定义在 `model.ts` 中（如封装为 `[Domain]VO`、`[Domain]AddVO`、`[Domain]GetVO`、`[Domain]SubmitVO` 等），而在 `service.ts` 的 JSON Schema 定义中，只需解构引用 `model.ts` 里的定义。
- 返回的列表及详情应严格遵守 JSON Schema 规范进行类型声明。
- 领域服务在 `[module]/index.ts` 中导出，并在子包 `index.ts` 下挂载。

### Step 2.5: 跨领域/模块解耦规范 (Service Registry)

为了保证后端 Monorepo 子包（如 `admin`、`enterprise` 与 `personal` 等）之间的绝对解耦，**禁止直接跨包 `import` 其它包的私有 `repository` 或 `service` 逻辑**。

若需要调用其它领域提供的底层服务，必须通过 `ServiceRegistry` 注册中心进行交互：

1. **服务提供方（如 `admin` 模块）**：
   - 在 `packages/admin/src/register.ts` 中引入要暴露的方法，并在对应的领域注册对象（如 `rpaRegister`）中导出。
   - 在 `initAdminRegistry()` 中通过 `reg.register('rpa', rpaRegister)` 将服务注册到服务总线。
   - 在 `packages/admin/src/common/registry.ts` 的 `IAdminServices` 接口中，添加相应的类型定义，确保全局 TypeScript 类型提示的健壮性。
2. **服务调用方（如 `enterprise` 模块）**：
   - 引入 `@hodor/admin/common/registry.js` 中的 `registry` 代理。
   - 通过 `registry.[domain].[method]`（例如 `registry.rpa.findDefaultActiveBrowser()`）进行解耦调用。

---

## 3. 全局种子与配置数据初始化

新增模块或接口路由后，必须同步执行以下流程以同步数据库及菜单：

1. **`server/packages/core/src/db/initMenu.ts`**: 挂载侧边栏导航树。
2. **`server/packages/core/src/db/initPermissions.ts`**: 新增对应的访问权限控制节点。
3. **`server/packages/core/src/db/initTranslation.ts`**: 集中导入多语言翻译对象（中文/英文）。
4. **`server/packages/core/src/types/business.ts`**: 扩展 `BusinessKey` 联合类型。

同步命令：

```bash
# 在 server 目录下执行本地同步（刷新 local.db）
pnpm run db:init node
```

---

## 4. 前端开发规范 (Vite + Module Federation)

### Step 4.1: 新增 API 请求定义

在 `platform/packages/ui/src/api/` 的对应子目录下（例如 `personal/profile.ts`）编写封装函数：

- 采用 `axiosPlus` 统一处理请求。
- API 路径前缀必须契合后端，例如：`/api/v1/personal/profile/list`。

### Step 4.2: 前端路由挂载与扁平化设计

- 前端物理页面路径应当**扁平化**，直接放置于 `pages/` 根目录下，避免繁琐的二级嵌套。
- 路由挂载在各自独立应用的 `src/routes.tsx` 中，利用 `import.meta.glob` 自动加载。
- 页面权限标识 `PREFIX_LV1` 分别为：`admin`、`enterprise` 或 `personal`。

### Step 4.3: 国际化多语言翻译机制

- 严禁在页面组件中针对 `t()` 翻译函数使用备用文字（例如 `t('key') || '默认文本'`）。
- 始终保持 `t('key')` 的干净输出，若缺少词条将直接展示键名，以防开发遗漏翻译，便于在运行时及时补全。
- **新加的翻译文案，必须先检查是否有重复**：对于常见的通用词汇（如新增、编辑、删除、时间等），请全局搜索 `server/packages/core/src/db/translation/shared.ts`。如果有重复，则直接复用已有的键名，**不要新增重复词条**。

### Step 4.4: 同步 OpenAPI 接口类型

若后端路由有增减，在后端启动状态下，执行以下命令同步前端类型：

```bash
npx openapi-typescript http://localhost:8787/doc.json --output platform/packages/ui/src/types/openapi.d.ts
```

### Step 4.5: 页面权限常量自动生成 (`generate-constants.js`)

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

### Step 4.6: 时间戳渲染规范

所有前端 React 组件在渲染数据库返回的时间戳时，必须统一使用 `dayjs` 库进行格式化（如 `dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss")`），严禁使用原生的 `new Date().toLocaleString()` 进行处理。
> **注意**：如果后端的 `create_time_utc` 等字段在数据库层面是毫秒级存储的，则直接传入 `dayjs(timestamp)`，不需要在前端乘以 1000。

### Step 4.7: 亮色/暗色模式主题适配规范

在开发前端 UI 组件需要做明暗模式（Light/Dark Mode）适配时，**严禁硬编码 `rgba` 颜色**，也**避免使用 `theme.palette.mode === 'dark' ? A : B` 的三元条件判断逻辑**。
请务必遵循 MUI 的最佳实践，使用预置的**语义化色板（Semantic Palette）**，这些色板已在底层绑定了明暗逻辑，能自动翻转颜色：
- **背景/容器**：使用 `background.paper` 或 `background.default`。
- **边框/分割线**：使用 `divider`，能自动在浅色与深色模式下呈现极佳的边界感，替代手写的 `boxShadow`。
- **状态颜色（悬停/禁用等）**：使用 `action.active`、`action.hover`、`action.disabled` 等。例如自定义滚动条时，可使用 `action.disabled` 作为滑块基础色，`action.active` 作为悬停色。
