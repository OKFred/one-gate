# OKFred Node Server 自动化集成测试用例建设待办事项 (todo_test.md)

本文件列出了各模块自动化测试用例（单元测试与集成测试）的补充与重構计划。确保所有解耦重构的业务模块都有完备的断言覆盖，并能在 Node.js (本地开发与CI) 和 Workers (线上容器运行沙箱) 双运行时无缝通过。

---

## 🎯 测试架构设计指南
1. **测试用例存放位置**：
   * 所有集成测试均需统一放置在模块目录下的 `__test/` 子目录中。
2. **同构/异构架构规则**：
   * **同构测试（无需环境特异 Mock）**：合并为一个 `.spec.ts` 文件（如 `i18n.integration.spec.ts`）。同时在 Node.js 和 Workers 配置中执行，享受统一的逻辑。
   * **异构测试（有环境特异 Mock 或平台库依赖）**：
     * 拆分为 `.workers.spec.ts`（只跑在 Workers，可导入 `cloudflare:workers`）与 `.node.spec.ts`（只跑在 Node）。
     * 两者共享同一个 `.shared.ts` 测试用例主体逻辑。
3. **利用全局 Setup**：
   * 在 Workers 模式中已配置全局自动加载 `test/setup.workers.ts`。无需再在各个 spec 中手写 `beforeAllHook` 去绑定数据库和缓存，降低样板代码行数。

---

## 📋 测试用例建设与重构清单

### 1. 已建立测试模块的优化与维护
* [x] **i18n 模块** ── 🟢 已合并为同构单文件 `__test/i18n.integration.spec.ts`，并补全了 `language`、`region`、`translation` 子目录的 Service 单元测试，测试覆盖 100% 绿灯。
* [x] **mail 模块** ── 🟢 已重构为异构测试模式（`action.integration.workers.spec.ts`、`action.integration.node.spec.ts` 与 `shared` 结合），并补充了 `account`、`log`、`template` 的单体服务测试。

---

### 2. 待建设测试用例的模块清单 (🔴 待启动)

#### AI 模块 (`src/api/ai/`)
* [x] **ai.integration.spec.ts**：建立同构全链路测试，覆盖：
  * AI 配置项的增删改查。
  * 智能助手聊天记录的持久化和会话拉取逻辑。
* [x] 对第三方大模型（LLM）的流式返回或请求客户端建立合理的 mock 机制，确保测试不依赖外部 API Key 且能稳定运行。

#### Enterprise 模块 (`src/api/enterprise/`)
* [x] **attendance.integration.spec.ts** ── 🟢 已完成
  * 建立考勤考表、上下班打卡记录和迟到缺勤规则校验的集成测试。

#### Maintenance 模块 (`src/api/maintenance/`)
* [ ] **api-task.integration.spec.ts**（需异构拆分或条件判断）：
  * 模拟并发抢占定时任务锁的悲观/乐观并发竞争测试。
  * 定时任务自动调度与状态转换测试。
* [ ] **audit_login.integration.spec.ts**：测试登录事件审计日志的安全拦截和保存。
* [ ] **cache.integration.spec.ts**：测试 KV 缓存以及内存缓存的清除与同步。

#### OSS 模块 (`src/api/oss/`)
* [ ] **file.integration.workers.spec.ts** / **file.integration.node.spec.ts**：
  * Workers 端：需要 Mock **Cloudflare R2** 绑定或 KV 元数据存储。
  * Node 端：需要 Mock 本地临时文件存储或 AWS S3 兼容的 SDK。

#### Swarm 模块 (`src/api/swarm/`)
* [ ] **swarm.integration.node.spec.ts**：
  * 因为控制 Docker Swarm 节点的 Docker 套接字 API（通常使用 Unix Socket / `got` / `dockerode`）主要在 Node.js 环境工作，需在此编写 Docker 守护进程 API 的 Mock 拦截，测试服务容器与节点的发现和启停状态更新。

#### System 模块 (`src/api/system/`)
* [ ] **auth.integration.spec.ts**：
  * 用户登录凭证生成、JWT 签名校验、权限白名单及 RBAC 访问权限拦截的全链路测试。
* [ ] **user & role & permission.integration.spec.ts**：
  * 用户、角色、系统细粒度权限的多对多关联关系测试。
  * 系统初始化时预设种子数据（Seeds）校验。
* [ ] **schema_form & schema_form_data.integration.spec.ts**：
  * 动态表单的 JSON Schema 校验。
  * 实例表单提交与动态字段检索集成测试。
