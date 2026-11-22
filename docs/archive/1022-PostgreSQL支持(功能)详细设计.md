# PostgreSQL 可选后端详细设计

## 状态与范围

2026-10-22，实施前设计。基于 `main` 的 `346f09bffb9007619cec0f71057a44a78df86837`，开发分支 `codex/postgresql-support`。本文保存先于实现的决策，实际完成情况另记实际落地文档。

用户确认首期完成“身份权限 → 企业与资产 → 软删除／撤销”的闭环，再逐批扩展其他模块。既有 Node SQLite/libSQL、Worker D1 的行为保持；PG 模式未适配的业务接口明确拒绝，不能暗中访问 SQLite/D1。数据库提供商不是业务分支：Supabase 仅作为 PostgreSQL 托管验证环境，不迁移现有账号体系到 Supabase Auth。

Supabase 验证使用用户指定的独立测试项目。该项目已有其他表，验证仅在独立 `one_gate_validation` schema 中执行，不修改 `public`、`auth`、`storage` 或既有业务表。项目标识与真实连接凭据通过仓库外私有配置注入，不能进入公开代码、日志、截图或对话。

后续扩展约束：数据库层仅依赖标准 PostgreSQL 与 Drizzle/pg，不在业务代码判断云服务商或硬编码主机。托管 Supabase、自托管 Supabase、普通 PostgreSQL 以及后续私有网络/Tunnel 接入均通过部署连接配置适配。本期不实现自托管 Supabase、Cloudflare Zero Trust/Tunnel、网络暴露与特定 Worker 的网络访问策略；后续需要按实际网络产品验证协议、TLS、身份及访问边界。

## 现状与问题

- `core/db/index.ts` 仅提供 libSQL/D1，现有交叉类型不代表跨方言兼容。
- 43 个 model 文件及公共字段等共 46 个 TS 文件依赖 SQLite；共 64 个表声明，当前分表 DDL 62 份，另两张 device-ops 表由历史迁移建立。本期只建立闭环依赖表，后续扩展必须依完整模型清单，不得漏表。
- SQLite 原始 SQL 包含 `strftime`、`changes()`、`json_valid/json_each`、`GLOB`、参数化 `IS`、标量 `MAX`；部分多语句写入依赖 SQLite 单写者和 D1 原子 batch。
- PG MVCC 不继承上述并发保证，不能只更换连接串、替换引号或把 SQLiteTable 强转为 PgTable。

## 数据库与仓库分层

1. 保留现有 SQLite `model.ts`、DTO、API JSON Schema、枚举及 service 合同。新增真正的 PG schema，使用 `pgTable`／`pgSchema`，从共享模型复用纯类型与枚举。
2. 公共运行时区分 `sqlite` 与 `postgresql`。原 SQLite database 类型不与 PG 做交叉或强转；PG 类型为 Drizzle `node-postgres` database。
3. 领域 repository 暴露稳定 port，SQLite/D1 与 PG 实现分别通过类型检查。service 与服务注册表继续依赖领域公共接口，跨包不导入私有仓库。
4. PG 模式的身份、角色、部门、权限、Token、企业、资产在同一 PG schema 中，最终权限条件与写入保持同一数据库事务。不采用系统身份 D1、企业资产另一个 PG 权威库的拆分。
5. 选择 PG 后连接失败、缺少 Hyperdrive、未建立 request scope 或未支持能力均明确失败，禁止回退本地内存库。

## 连接生命周期

| 环境        | 策略                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Node SQLite | 维持原 libSQL 行为                                                                                                  |
| Worker D1   | 维持原绑定与调度行为                                                                                                |
| Node PG     | 私有 `DATABASE_URL`，进程级有界 `pg.Pool`，每请求/任务注入数据库上下文                                              |
| Worker PG   | `HYPERDRIVE.connectionString`，每 fetch／scheduled 创建独立 `pg.Client`，在生命周期末释放；不跨请求复用 socket/Pool |

采用 `drizzle-orm/node-postgres` 与 `pg`；不升级到 Drizzle 1.0 RC，也不采用当前 Hyperdrive 不支持的 Drizzle＋Postgres.js 组合。Hyperdrive 上游为 Supabase Direct connection，不叠加 transaction pooler。首期关闭 Hyperdrive 查询缓存，仍保留连接池，以保证撤权、冻结、删除后读取和写后读的新鲜度。Node 开发若无 IPv6，可使用私有配置指定 Supabase session pooler，Worker 仍走 Hyperdrive→direct。

运行时上下文使用显式作用域，隔离并行请求、后台任务与两种数据库。敏感连接值仅交给驱动，错误日志仅输出稳定代码和安全元数据。PG 应用角色与迁移身份分离；本期验证不能新建公开访问入口或将数据库暴露给浏览器。

## 类型与数据合同

- ID、UTC 毫秒及要求精确整数的字段采用 PG `bigint` number mode，验证 JS 安全整数边界；不能使用 32 位 integer 保存 UTC 毫秒。
- SQLite integer boolean 对应 PG boolean；API 仍为 boolean，原始 SQL 的 `=1` 等条件必须改为 PG 条件。
- SQLite JSON mode 文本对应 PG jsonb，并保持原对象/数组类型；原先合同为 JSON 字符串的普通 text 首期保持字符串，读取权限数组必须对损坏 JSON 失败关闭。
- real 对应 double precision，不借本期改变财务精度合同。
- ID identity 是原自增能力的对应实现；其余新增业务字段不增加数据库默认值。创建、删除、更新字段由服务端显式写入。
- 恢复、版本、分页与排序返回合同保持；对 PG bigint、count、rowCount 做安全解码，不以 `any` 掩盖差异。

## 事务、并发与期限

PG 写入使用真实 transaction、影响行数检查和稳定业务错误，不移植 `changes()`＋故意非法 JSON 的 SQLite batch 断言。按统一顺序获取锁，避免业务代码在事务外先检查后写入。

首期实际落地采用更保守的公共写入 guard 行锁：所有闭环写事务先锁 `one_gate_write_guard(id=1)`，包括身份撤回、企业及资产写入。这样先保留与 SQLite 单写者相当的跨域并发安全，代价是 PG 写入吞吐受单锁限制；后续再细分为全局身份锁与租户锁。每次读写事务均使用 `SET LOCAL search_path` 指定独立 schema，不依赖 Hyperdrive 连接池的会话状态。

- 企业成员、最后 owner、交接和恢复：锁定企业行，最终权限及 owner 有效性在事务内重查；不能让两个 owner 同时移除对方后留下无 owner 企业。
- 资产、安装与测点：首期按企业串行化关键写入，统一企业→资产锁顺序，检查同企业、有效主机及完整历史区间；跨资产争抢同一采集键同样受控。
- 部门/角色删除与用户、角色范围引用写入：共享锁序/事务策略，确保引用新增与删除之间不存在 PG 快照竞态。
- CAS 使用 PG null-safe 比较和 `RETURNING`。名称冲突、旧版本、父部门不可用分别映射原稳定业务码。
- 15 秒撤销仍要求本次删除人且当前具备删除权限。判定使用数据库实际执行时刻；PG `now()` 固定于事务开始，故用实时钟并在锁等待后判定。重试不得重算原删除版本或延长期限。
- 30 天恢复和清理保留现有边界、删除人、预期版本、引用检查及每类批量上限；PG scheduled 与 Node 定时入口使用同一适配器机制。
- 不自动重试结果未知的外部写请求。若采用可重试事务，必须限定数据库明确回滚的 serialization/deadlock 错误，并保持原业务版本。

## 首期能力与关闭规则

首期包含密码/JWT 和 API Token 认证、当前角色权限、用户/角色/部门关联校验、菜单读取、闭环所需配置/翻译/日志，以及企业与资产全部现有接口、部门/角色软删除与回收站/撤销/到期清理。

PG HTTP 在业务路由前应用显式允许清单；SSO、邮件、移动设备/RPA/MQTT、工作流、财务等未适配模块返回明确不支持结果，且后台任务不能调用它们。登录相关非必要通知只能明确禁用该能力，不能因吞掉 PG 数据库错误而假装成功。健康和版本接口保留，但健康不能代替数据库就绪检查。

能力清单必须由测试覆盖：支持接口不应被门禁误挡；未支持接口不能落入 SQLite、执行 D1 binding 或异步启动旧后台任务。

## PG 迁移、种子与 Supabase 验证

PG 使用独立编号迁移和结构契约，不执行 D1 的 `0016/0017` 或全量 SQLite SQL。PG schema DDL 由当前 PG 模型定向生成，保留迁移历史。迁移使用成功账本、checksum、事务/锁和重复执行保护；失败不能留下成功标记。显式 seed ID 后核对 identity 序列高水位。

首期提供面向独立 schema 的显式迁移/验证命令，默认预检；不自动迁移生产 D1 数据。种子只初始化闭环基础元数据，禁止重置用户密码、清空自定义菜单/权限或赋予普通角色新增权限。测试用户及 Token 为合成数据；密钥不进产物。

验证分开记录：本地真实 PG、Node 实际 HTTP、Worker 本地实际 Hyperdrive/PG 驱动、Supabase 实际连接与事务、云端 Worker→Hyperdrive→Supabase。只做构建或本地直连不能宣称云端链路验收。Supabase 权限/凭据或 Hyperdrive 配置缺失时保留明确待验项目，不伪造通过。

## 并行工作：gate 发布与种子

`gate.this-time.com` 已登录 superadmin，但企业/资产菜单缺失，直接路径跳转 NotFound；菜单缺失本身可触发前端门禁，不能据此断定前端包一定旧版。

- `db:init node` 只改本地 SQLite，且会同步全量基础种子，不会同步远端 D1。
- `db:init worker remote` 的全量结构流程不导入基础菜单/权限，不应用于补已有生产库菜单。
- `sync:permissions` 生成前端权限常量；`sync:schemas --remote` 仅同步系统表单配置，不补菜单。
- 本轮 D1 旧库应顺序应用 0016 和 0017，后者定向写菜单 108/109、7 权限、平台角色绑定及后端翻译。发布后再确认权限缓存版本、真实菜单及三个前端版本。
- 当前公开 one-gate CI 不自动部署；旧 node_server 私有 dev/master 流水线不能因新仓库 main 合并而触发。

增加默认只读发布预检：必须显式指定已核对的私有目标配置，检查迁移账本、7 表、菜单、权限与平台角色绑定；不读取业务内容、凭据或任意物理表。公开全零资源模板必须拒绝 remote。后续实际发布应以同一提交构建 Worker 和三个前端，遵循原资产迁移维护窗口和恢复规则，不能通过全量 init 捷径掩盖问题。

## 验证与交付

先记录原 6 项根 TS 诊断及应用无诊断基线；变更后比较。执行变更格式检查、严格新增代码类型检查、SQLite Node 和 D1 相关回归、真实 PG 两连接竞争与失败回滚、Node/Worker 打包、前端回归和 `git diff --check`。独立记录代码验证、迁移演练和线上验收。

必须覆盖 tenant/账号/Token 撤回、最后 owner、跨企业不可见、损坏数组、资产唯一约束与历史边界、退役、14,999/15,000 毫秒及锁等待跨期、重复删除、旧版本恢复、恢复/清理竞争、批量清理重试，以及不支持模块失败关闭。

## 官方依据

- [Cloudflare Drizzle＋pg](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/)
- [Hyperdrive 连接生命周期](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/)
- [Hyperdrive 读缓存与写后读](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/)
- [Supabase 连接方式](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL 当前时间语义](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PG 事务隔离](https://www.postgresql.org/docs/current/transaction-iso.html)
