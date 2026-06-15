# OKFred Node Server 仓储层解耦重构待办事项 (todo_repository.md)

本文件列出了 `server` 中需要进行职责分离（SOC）解耦改造的模块清单。目标是把直接编写在 `service.ts` 中的数据库 ORM（Drizzle）查询、筛选拼装、插入更新逻辑，彻底剥离到独立的 `repository.ts` 中，使 Service 专注于纯粹的业务逻辑与工作流控制。

---

## 🎯 重构标准与要求
1. **新建 `repository.ts`**：
   * 将所有的数据库查询（如 `db.select().where(...)`）和修改（如 `db.insert()`, `db.update()`）移至 `repository.ts`。
   * 查询条件拼接函数（如 `buildWhereCondition`）与排序也封装在 Repository 中。
2. **重构 `service.ts`**：
   * 移除 `import db ...` 和任何来自 `drizzle-orm` 的操作符导入。
   * 所有数据读写和变更操作均调用 Repository 导出的方法。
3. **强类型约束**：
   * 严格定义入参与出参类型（如利用 `InferInsertModel` 和 `InferSelectModel` 派生），禁止使用 `any` 绕过类型检查。
   * 时间戳字段统一使用毫秒数（例如使用 `Date.now()`）并还原为简洁的 `Partial<Omit<...>>` 签名。

---

## 📋 模块重构待办清单

### 1. Mail (邮件模块) ── 🟢 已完成
* [x] **template (邮件模板)** ── 🟢 已完成
* [x] **account (发信账户)** `src/api/mail/account/` ── 🟢 已完成
  * 改造 `service.ts`，抽离 Drizzle 数据库调用至新文件 `repository.ts`。
* [x] **log (发信日志)** `src/api/mail/log/` ── 🟢 已完成
  * 改造 `service.ts`，抽离 Drizzle 数据库调用至新文件 `repository.ts`。

---

### 2. AI (智能助手模块) ── 🟢 已完成
* [x] **chat (会话记录)** `src/api/ai/chat/` ── 🟢 已完成
  * 抽离 SQL 查询至 `repository.ts`（包含会话列表分页、历史消息记录查询、消息持久化插入等）。
* [x] **config (AI配置)** `src/api/ai/config/` ── 🟢 已完成
  * 抽离 SQL 读写至 `repository.ts`。

---

### 3. Enterprise (企业管理模块) ── 🟢 已完成
* [x] **attendance (考勤管理)** `src/api/enterprise/attendance/` ── 🟢 已完成
  * 抽离打卡记录插入、考勤状态更新、关联统计等 ORM 操作至 `repository.ts`。

---

### 4. Maintenance (系统维护与任务模块) ── 🟢 已完成
* [x] **api-task (API定时任务)** `src/api/maintenance/api-task/` ── 🟢 已完成
  * 抽离任务表 `apiTaskTable` 的查询、锁抢占及状态更新 SQL 至 `repository.ts`。
* [x] **audit_login (登录审计)** `src/api/maintenance/audit_login/` ── 🟢 已完成
  * 抽离登录日志插入与多维过滤 SQL。
* [x] **compliance (合规审计)** `src/api/maintenance/compliance/` ── 🟢 已完成
* [x] **cron (计划任务)** `src/api/maintenance/cron/` ── 🟢 已完成
  * 抽离定时任务及运行日志的 CRUD，对接仓储层，并添加全流程集成测试。
* [x] **cache (缓存管理)** `src/api/maintenance/cache/` ── 🟢 已完成（无需改造，无直接 ORM 读写）
* [x] **init (系统初始化)** `src/api/maintenance/init/` ── 🟢 已完成（无需改造，无直接 ORM 读写）

---

### 5. OSS (对象存储模块) ── 🟢 已完成
* [x] **config (存储桶配置)** `src/api/oss/config/` ── 🟢 已完成
* [x] **file (文件元数据)** `src/api/oss/file/` ── 🟢 已完成（无需改造，无直接 ORM 读写）

---

### 6. Swarm (Docker 节点管理模块) ── 🔴 未完成
* [ ] **docker (服务容器)** `src/api/swarm/docker/` ── 🔴 待改造
* [ ] **docker_config (Docker配置)** `src/api/swarm/docker_config/` ── 🔴 待改造
* [ ] **nodes (节点管理)** `src/api/swarm/nodes/` ── 🔴 待改造

---

### 7. System (系统权限与架构模块) ── 🔴 未完成
* [ ] **user (用户账户)** `src/api/system/user/` ── 🔴 待改造
  * 抽离用户基础信息、密码验证关联、部门及状态更新的 SQL。
* [ ] **role (系统角色)** `src/api/system/role/` ── 🔴 待改造
* [ ] **permission (细粒度权限码)** `src/api/system/permission/` ── 🔴 待改造
* [ ] **role_permission (角色权限关系联表)** `src/api/system/role_permission/` ── 🔴 待改造
* [ ] **department (组织部门结构)** `src/api/system/department/` ── 🔴 待改造
* [ ] **menu (菜单定义)** `src/api/system/menu/` ── 🔴 待改造
* [ ] **schema_form (动态表单定义)** `src/api/system/schema_form/` ── 🔴 待改造
* [ ] **schema_form_data (表单实例数据)** `src/api/system/schema_form_data/` ── 🔴 待改造
