# PostgreSQL 可选后端实施计划

## 实施前记录

2026-10-22，基于 `main@346f09bf`，分支 `codex/postgresql-support`。本文先于实现建立；用户已确认首期关键闭环、后续分批扩展，并指定独立 Supabase 测试项目。项目连接信息留在仓库外。实现开始不表示已发布、已迁移或已完成远端验证。

后续补充：保持数据库提供商和网络部署可替换。自托管 Supabase、Cloudflare Zero Trust/Tunnel 与特定 Worker 的私网访问策略不在本期实现，仅保留配置和基础设施边界，不扩展业务 API。

## 阶段与完成标准

1. **设计及基线**：完成详细设计与本计划；记录 Node/D1、根/应用 TS 及构建基线。建立独立 PG 验证资源，不操作其他 Docker 数据或现有容器。
2. **PG 基础设施**：新增 typed pg 驱动、schema/迁移账本、Node Pool 与 Worker request/task scope；明确配置错误及能力门禁；不触碰原 D1 迁移历史。
3. **关键闭环适配**：真正的 PG schema 和 repositories，覆盖系统身份与权限依赖、企业/资产及部门/角色软删除回收；SQL/并发语义显式实现，共用 DTO 和 service 合同。
4. **真实本地 PG 验证**：迁移、seed、重复执行、回滚、HTTP 合同、两个并发连接、撤权和时间边界；保留 SQLite/D1 回归。
5. **Supabase 验证**：仅独立验证 schema；真实连接/事务/授权链。按可用凭据与资源分开记录 Node、Worker本地、云端 Hyperdrive 链路，不将未执行项记为通过。
6. **收尾**：README/部署说明/实际落地、格式与 TS 差异、构建和密钥/文本/差异检查；报告复盘次数及残留问题。本轮不默认提交、PR、合并或发布代码。

## 预计文件范围与分工

| 范围                                                       | 计划变化                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `server/packages/core/src/db/postgresql/`                  | 真正 PG schema、类型、连接/事务/迁移和作用域能力；命名随实际拆分调整           |
| `server/packages/core/src/db/index.ts`                     | 保持 SQLite/D1 原行为，增加 PG 模式错误回退防护；不扩成交叉万能类型            |
| `server/packages/admin/src/system/`                        | 关键身份/权限、用户/角色/部门、Token、菜单及 reference guards 的 PG 实现/ports |
| `server/packages/admin/src/base/`、`i18n/`、`maintenance/` | 仅闭环必需配置/翻译/日志及软删除清理；其余能力明确关闭                         |
| `server/packages/enterprise/src/tenant/`、`asset/`         | PG 仓库，真实事务及统一锁序，服务合同保持                                      |
| `server/apps/server/src/`                                  | Node/Worker 作用域与 PG 路由/任务允许清单，PG 集成/竞争测试                    |
| `server/apps/server/postgresql-migrations/`                | 独立 PG 迁移、checksum/成功标记，不改 D1 0016/0017                             |
| `server/scripts/`、包 scripts/lockfile                     | PG 定向生成、迁移/验证/预检命令，`pg` 与类型依赖                               |
| `server/apps/server/d1-contract/`、相关 scripts/tests      | 资产发布只读元数据预检及明确私有配置/目标防护                                  |
| `docs/`、中英文 README、部署说明                           | 操作说明、范围/能力清单、真实验证证据和边界                                    |

不修改 `.agents/` 规范，不扩大前端页面业务，不把 PG 数据库连接串加入任何 `VITE_` 配置。若 API 合同未变，不制造 OpenAPI 类型大范围重生成差异。

## gate 并行计划

1. 只读确认现有本地/远端命令和旧私有发布流程，说明 `db:init node` 不同步生产。
2. 在代码中补充默认只读且目标明确的资产发布预检，检查结构＋菜单/RBAC元数据，使用独立本地 D1 演练成功、缺项及错误目标。
3. 核对真实私有 Cloudflare 配置/线上提交与迁移账本后，给出只针对本轮升级的操作顺序。不得直接使用公开全零 ID 模板执行 remote，不跑全量 seed/reset。
4. 若远端资源/凭据可用且用户授权覆盖发布，先完成备份/维护与可审查产物，再按实际部署步骤推进；否则具体记录待补条件。PG 改造不作为阻止既有 D1 资产上线的依赖。

## 测试清单

- 原 SQLite Node 全量、D1 关键回归；原 TS 基线 6 项保持不增加。
- PG 迁移首次/重复/checksum变更/部分结构/后期失败回滚、独立schema隔离、ID序列。
- 用户、角色、API Token、系统权限与当前企业能力组合，撤回和冻结立即生效；未适配接口不触碰旧数据库。
- 企业/资产全部现有写入与历史查询；两连接并发 owner/测点/引用竞争；稳定 PG 错误分类。
- 部门/角色删除、撤销、恢复、提前清除、30天到期及任务批量；15秒前/边界/锁等待、旧版本和结果未知。
- Worker 独立请求/后台 scope、释放及配置失败；Node Pool与任务；缓存禁用要求。
- Supabase与云端Hyperdrive按实际执行结果记录，不以 mock 或 dry-run 代替。

## 风险和回退

现有环境默认仍走原后端；PG 为显式选择的新部署能力，未经验证不迁移生产数据。PG 试验 schema 的清理与数据库角色操作需精确命名、保留验证证据并遵守用户授权，不删除现有项目表。上线旧库的 D1迁移与PG迁移是独立路线，不能互换脚本。每轮复盘前暂存，最多5轮；实际落地文档分别列明完成、偏差和未验证项。
