# OKFred Node Server & Platform SOC 改造待办事项 (TODO)

本文件记录了排查出的职责分离（SOC）及清洁架构优化点，作为后续重构与质量保证的指导。

---

## 📋 待办事项列表

### 1. 前后端权限定义的中心化与类型安全 ── 🟢 已完成 (高优先级)
* **现状**：
  * 后端权限同步在 `server/src/db/initPermissions.ts` 中通过 `permissionSeeds` 定义（松散的 `Record<string, Record<string, string[]>>`）。
  * 前端权限在 `platform/src/hooks/usePermission.ts` 中硬编码了整个权限对象。两端完全脱节，易导致权限码拼写错误或遗漏（如前端缺失 `ai.chat` 和动态表单等权限）。
* **改进方案**：
  * **后端侧**：在 `initPermissions.ts` 中，对 `permissionSeeds` 采用强类型约束（通过 `satisfies` 匹配 `BusinessKey`），在编译期拦截非法的权限子键组合。
  * **自动同步**：编写脚本或在编译流程中，根据后端的权限树定义自动生成前端的 `usePermission.ts` 权限对象，保持“单源真理”。

### 2. 定时任务调度器与具体任务执行器的解耦 ── 🟢 已完成 (中优先级)
* **现状**：
  * `server/src/jobs/scheduler.ts` 中耦合了调度器逻辑（时间解析、乐观锁抢占、运行计数、任务日志）与具体的任务执行技术（通过 `if-else` 分发到内置静态任务或通过 `apiTaskTable` 动态调用的 HTTP 网络请求）。
* **改进方案**：
  * **引入执行器模式 (Executor / Strategy Pattern)**：抽象出统一的执行接口（如 `supports(jobKey)` / `execute(job, db)`）。
  * 将静态任务与 HTTP 任务拆分到独立的 `StaticJobExecutor` 和 `HttpJobExecutor` 中。调度引擎只持有执行器列表进行动态分发，消除动态导入和调度层对具体业务的硬编码依赖。

### 3. Service 层中数据库 ORM (Drizzle) 查询与业务逻辑的解耦 ── 🟢 已完成 (低优先级)
* **现状与改造**：
  * **已重构模块**：目前已对 `src/api/mail/template` 和 `src/api/i18n` (包含 `language`、`region`、`translation`) 模块完成了仓储层解耦改造。
  * **解耦方案**：所有的 Drizzle ORM 查询和变更拼装（如 `buildWhereCondition` 等）全部封装至各自模块目录下的 `repository.ts` 中。
  * **Service 瘦身**：使得 `service.ts` 保持纯粹的业务工作流与领域逻辑，不再含有 ORM 特有的 API，提高了代码的可维护性和模块化设计。通过多运行时集成测试（Workers & Node.js）进行了全量覆盖，证明重构后业务逻辑完全正确。

### 4. 多语言检测与自动化合规拦截机制的 SOC 闭环 ── 🟢 已完成 (高优先级)
* **现状与改造**：
  * **增强扫描器**：已重构 `scan-i18n-enhanced.js`。现在它支持递归解析 `initTranslation.ts` 中的 `import` 并深度遍历所有子包的 `translation.ts` / `shared.ts` 文件。并且增加了对**后端项目目录 (`server/src`)** 的扫描，全面支持对前后端所有真实使用的多语言键（包括后端错误码、定时任务与日志模块的 Key）的联合排查，过滤了非翻译用途的业务模块标识（BusinessKey）。
  * **移除拼接，显式枚举**：对前端代码进行了完全清零的改造，将动态拼接 `t(\`permission.category.\${row.category}\`)` 及 Schema Form 模板翻译等全部改为**显式 Map 映射**，消除了扫描器的盲区。
  * **安全校验与 Git 钩子拦截**：集成了 `--fail-on-missing` 参数并集成进 Git `pre-commit` 钩子。现在本地 commit 时若有任何一处遗漏的多语言键，会自动打印具体的代码文件与行号并以状态码 `1` 强行阻断。目前前后端使用的多语言缺失数量为 **0**。
