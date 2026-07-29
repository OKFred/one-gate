# 后端开发规范指南 (Backend Guidance)

本指南面向本项目后端模块 (`server/packages/`) 的架构与代码编写规范，以 `personal` 模块为例。

---

## 1. 声明数据表模型 (Model) 与默认值规范

在对应的业务包内创建领域文件夹，并定义 Drizzle Schema。例如在 `packages/personal/src/profile/model.ts` 中：

- **数据库默认值严格禁令**：所有数据表结构（Drizzle Schema）中，**严禁添加任何 `.default(...)` 默认值**（除了创建时间 `create_time_utc` 允许使用 `.default(getCurrentTimestampUtcSql())` 外）。
- **默认值分层治理策略**：
  1. **优先前端表单赋值**：属于用户交互的配置项（如初始开关状态、单选默认选项、默认数值等），尽可能在前端 UI 表单初始化（State / Form Initial Values）中给予默认值。
  2. **Service 层兜底与系统列控制**：不适合在前端设置或由系统自动计数的字段（如 `permissionCount: 0`、`runCount: 0`、`status` 等），必须在各个 `service.ts` 的插入接口逻辑中进行显式解构与默认值兜底。

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

---

## 2. 自动生成并归类 SQL DDL 文件

在定义好 Drizzle Schema 后，**无需手动编写 SQL 建表脚本**。直接在 `server` 根目录下运行 DDL 自动生成与归类工具：

```bash
pnpm run db:generate
```

该命令内部会调用 `drizzle-kit` 读取对应的 `model.ts` 并把解析出来的 DDL 语句拆分并全自动保存到 `@hodor/core` 包中的相应物理目录下（例如：`packages/core/src/db/sql/personal/personal_profile.sql`）。

---

## 3. 数据库增量迁移 (Migration)

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

---

## 4. 实现业务持久层 (Repository & Service)

在 `repository.ts` 中完成低级别的数据库查询：

- 采用 Drizzle ORM 进行 DML 与单条/多条过滤。
- 列表查询须支持动态 `orderBy` 列排序与降序。

在 `service.ts` 中描述并暴露 REST 端点：

- **所有业务接口设计必须且只能使用 POST 请求**：禁止使用 GET、PUT、DELETE 等其他方法，以保证高阶 `encapsulation` 中间件能正确且安全地从 JSON Body 中提取与校验数据。
- **禁止在 `service.ts` 中硬编码 API 请求或响应的字段定义 (Properties)**：为了保证类型与数据模型规范的集中管理，无论该业务是否有数据表对应，API 接口的 properties 字段属性必须定义在 `model.ts` 中（如封装为 `[Domain]ReqVO`、`[Domain]ResVO` 等），而在 `service.ts` 的 JSON Schema 定义中，只需解构引用 `model.ts` 里的定义。
- 返回的列表及详情应严格遵守 JSON Schema 规范进行类型声明。
- **严禁在 `service.ts` 中直接调用 `encapsulation` 挂载**：`service.ts` 的默认导出必须是包含各个 API 定义的纯对象（即强制推导为 `Record<string, API>` 类型，如 `export default { get: getApi, update: updateApi }`）。
- **独立的路由挂载入口**：领域服务必须在同级目录新建的 `[module]/index.ts` 中调用 `encapsulation(service, "...")` 导出 `app`，并在子包的根 `index.ts` 下统一挂载路由，确保业务代码与挂载行为完全解耦。

---

## 5. 跨领域/模块解耦规范 (Service Registry)

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

## 6. 全局种子与配置数据初始化

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
