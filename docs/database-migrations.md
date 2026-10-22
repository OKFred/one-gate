# 数据库初始化与迁移

以下命令从 `server/` 执行。生成 DDL、初始化新库、升级旧库和同步种子是不同操作；生成 SQL 不会升级数据库。先确认数据库类型、目标文件或资源及当前版本，再按对应流程执行。

## 现有入口

| 用途                   | 命令                                                                               | 行为                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| SQLite 新库初始化      | `pnpm run db:init node`                                                            | 创建当前结构并同步基础种子；结构失败立即停止，不用于旧库升级    |
| D1 新库结构            | `pnpm run db:init worker local` / `remote`                                         | 执行当前建表文件，不同步菜单、权限或管理员种子                  |
| D1 增量迁移            | `pnpm run db:migrate:worker:local` / `remote`                                      | 使用 Wrangler 账本，只应用待执行编号迁移                        |
| D1 结构验证            | `pnpm run db:check:worker:local` / `remote`                                        | 验证当前完整结构契约                                            |
| Node 部门软删除升级    | `pnpm run db:migrate:department:node --database=<existing-local-sqlite-file>`      | 事务执行 0013、0014，校验数据及自增序列，保留成功标记           |
| Node 角色软删除升级    | `pnpm run db:migrate:role:node --database=<existing-local-sqlite-file>`            | 事务执行 0015，检查引用、数据及自增序列                         |
| Node 企业资产升级      | `pnpm run db:migrate:assets:node --database=<absolute-existing-local-sqlite-file>` | 事务执行 0016、0017 的结构和元数据                              |
| SQLite 全量 DDL 生成   | `pnpm run db:generate`                                                             | 从模型更新新库建表文件；不连接数据库、不修改历史迁移            |
| 资产 DDL 校验          | `pnpm run db:generate:assets`                                                      | 默认只读检查；显式 `--write` 才更新资产 DDL 和结构契约          |
| PostgreSQL DDL 校验    | `pnpm run db:generate:postgresql`                                                  | 默认只读检查；显式 `--write` 只更新新库 DDL                     |
| PostgreSQL 迁移 / 种子 | `pnpm run db:migrate:postgresql` / `db:seed:postgresql`                            | 默认检查状态；显式 `--apply` 才写入，连接及 schema 必须单独配置 |

Node 专项迁移的 `--database` 建议一律传现有文件的绝对路径，例如 `D:/private/one-gate.db`，不得使用远端 libSQL URL。它们只适用于各自的前置结构，不是从任意旧版本升级的通用入口。保留原成功标记和校验值，不可删除标记后强行重跑。当前结构的新库不需要重放历史迁移。

PostgreSQL 配置、TLS、权限、只补缺失种子及独立 schema 说明见 [PostgreSQL 部署](postgresql.md)。SQLite / D1 SQL 不能用于 PostgreSQL，反之亦然。

## 已停用入口

`db:init node migration`（含 `--node --migration`）已停用。过去它会无账本重放整个历史目录，忽略部分错误，之后仍执行全量种子。本入口现在在配置加载和数据库操作前报错退出。`db:generate migration`、`--migration`、`incremental`、`--incremental` 也不再向历史目录生成 SQL。

早期版本的具体起点若早于上述专项迁移，应先检查备份副本中的结构，按版本定向审查历史 SQL；不提供“全部重跑”兼容开关。旧文档里的 Node migration 命令以本说明为准。

`db:init worker ... migration` 作为旧命令兼容，继续调用 Wrangler 官方账本，不读 legacy 目录，不同步种子。优先使用表中的 `db:migrate:worker:*` 明确入口。

## 文件保留规则

- `server/packages/core/src/db/sql/`：当前 SQLite / D1 新库 DDL，可由生成器维护，不是迁移账本。
- `server/packages/core/src/db/migrations/`：25 份早期无账本 SQLite 升级 SQL，保留为版本资料与迁移回归测试输入；不再自动扫描执行，不再写入新迁移。
- `server/apps/server/d1-migrations/`：19 份已发布或待发布的 D1 编号 SQL。文件名与内容保持稳定，不能因内容重复而删除、重命名或重编号。
- `server/apps/server/scripts/migrate-*.ts`：仍在使用的受控 Node 旧库升级工具，复用固定编号 SQL，事务和成功标记随迁移一起提交。
- `server/apps/server/postgresql-migrations/`：PostgreSQL 独立编号历史，与 SQLite / D1 分开维护。

D1 的 `0000_legacy_schema_baseline.sql` 只是已有旧结构的基线标记，并不创建所有业务表。两个 `0001_*` 文件以及内容相同的 mobile 迁移沿用原名称，避免影响已存在的账本。Wrangler 的文件名记录规则参见 [Cloudflare 官方说明](https://developers.cloudflare.com/d1/reference/migrations/)。

## 旧库升级与数据保护

1. 备份并验证可恢复，记录目标版本；维护窗口暂停有关写入。在独立副本演练，再应用到实际目标。
2. 执行该版本所需的编号迁移，保留事务、数据校验、引用检查和账本。D1 连续多份迁移不是整体事务；后续失败不会回滚此前已成功的迁移，先核对账本再处理。
3. 检查完整结构、既有业务行和 ID / 自增序列、菜单权限与功能。Node 专项迁移失败保持写入暂停，按错误检查，不能改用全量初始化“补齐”。
4. 验证成功后再恢复写入。当前 gate 资产发布所需 0015–0017、元数据与版本检查见 [gate 发布说明](<1022-gate发布与种子(运维)说明.md>)。

SQLite 的全量种子即使不 reset，仍会覆盖部分已有菜单、权限、翻译和管理员配置。清理工具没有改变这项既有行为，已有库不能把“全量同步”当作无损升级。迁移和种子不应隐式串联。初始化工具也不再顺带执行为 `system_schema_form` 补 `source` 的一次性 `ALTER TABLE`；缺列旧库须先审查升级，不能靠初始化补列。

全量 DDL 生成器使用独立临时目录，在所有领域生成成功后才更新建表文件；不会清空历史。该命令会更新全量建表文件，应检查生成差异，另行新增编号升级 SQL。资产和 PostgreSQL 的定向校验工具仍适合各自模型维护。
