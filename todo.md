# OKFred Node Server & Platform SOC 改造待办事项 (TODO)

本文件记录了排查出的职责分离（SOC）及清洁架构优化点，作为后续重构与质量保证的指导。

---

## 📋 待办事项列表

### 1. 前后端权限定义的中心化与类型安全 ── 🔴 待开始 (高优先级)
* **现状**：
  * 后端权限同步在 `server/src/db/initPermissions.ts` 中通过 `permissionSeeds` 定义（松散的 `Record<string, Record<string, string[]>>`）。
  * 前端权限在 `platform/src/hooks/usePermission.ts` 中硬编码了整个权限对象。两端完全脱节，易导致权限码拼写错误或遗漏（如前端缺失 `ai.chat` 和动态表单等权限）。
* **改进方案**：
  * **后端侧**：在 `initPermissions.ts` 中，对 `permissionSeeds` 采用强类型约束（通过 `satisfies` 匹配 `BusinessKey`），在编译期拦截非法的权限子键组合。
  * **自动同步**：编写脚本或在编译流程中，根据后端的权限树定义自动生成前端的 `usePermission.ts` 权限对象，保持“单源真理”。

### 2. 定时任务调度器与具体任务执行器的解耦 ── 🔴 待开始 (中优先级)
* **现状**：
  * `server/src/jobs/scheduler.ts` 中耦合了调度器逻辑（时间解析、乐观锁抢占、运行计数、任务日志）与具体的任务执行技术（通过 `if-else` 分发到内置静态任务或通过 `apiTaskTable` 动态调用的 HTTP 网络请求）。
* **改进方案**：
  * **引入执行器模式 (Executor / Strategy Pattern)**：抽象出统一的执行接口（如 `supports(jobKey)` / `execute(job, db)`）。
  * 将静态任务与 HTTP 任务拆分到独立的 `StaticJobExecutor` 和 `HttpJobExecutor` 中。调度引擎只持有执行器列表进行动态分发，消除动态导入和调度层对具体业务的硬编码依赖。

### 3. Service 层中数据库 ORM (Drizzle) 查询与业务逻辑的解耦 ── 🔴 待开始 (低优先级)
* **现状**：
  * `service.ts`（例如用户服务 `server/src/api/user/service.ts`）内既负责核心业务流程，也深度嵌入了 Drizzle SQL 的链式拼接与 Where 条件组装（如 `buildWhereCondition` 等）。
* **改进方案**：
  * 引入仓储层（Repository Pattern）或专用查询对象（Query Object），将所有的 ORM 查询逻辑封装至 `repository.ts` 中。
  * 使得 `service.ts` 保持纯粹的业务工作流与领域逻辑，不再含有 ORM 特有的 API，也有利于通过 Mock Repository 编写轻量级的服务单元测试。

### 4. 多语言检测与自动化合规拦截机制的 SOC 闭环 ── 🟡 进行中 (高优先级)
* **现状**：
  * `platform/scripts/scan-i18n-enhanced.js` 能有效找出前端未在后端同步的多语言键，但仅生成了离线的 Markdown 报告，无法在开发/构建阶段拦截错误。由于最近的多语言架构重构（将翻译条目拆分到各子包的 `translation.ts` 中），原本扫描 `initTranslation.ts` 的正则已失效，需更新扫描器。
* **改进方案**：
  * **修复扫描器**：使 `scan-i18n-enhanced.js` 支持解析 `initTranslation.ts` 中所有的 `import` 引用，动态、深度遍历所有子包的 `translation.ts` 文件以收集完整的多语言键。
  * **支持拦截拦截**：为扫描脚本添加 `--fail-on-missing` (或 `--ci`) 命令行参数。当检测到前端使用了未定义的 Key 时，控制台打印详细的位置信息并以非零状态码退出 (`process.exit(1)`)。
  * **构建与构建链集成**：将扫描校验集成到前端 `package.json` 的 `build` 脚本以及 Git `pre-commit` 钩子中，构建/提交前自动运行，防止将缺失多语言文案的代码推入仓库。
