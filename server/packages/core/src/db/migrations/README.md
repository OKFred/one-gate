# 历史 SQLite 升级资料

本目录的 25 份 SQL 是早期无账本版本的升级资料，也是
`schema-migration.spec.ts` 的真实迁移回归输入。保留原文件名和 SQL 内容，
不再向本目录生成新迁移，也不再自动扫描执行全部文件。

`db:init node migration` 已停用，避免重复 `ALTER TABLE` 和随后覆盖种子。
现有 Node 专项升级、D1 官方账本和 PostgreSQL 独立迁移入口见
[数据库迁移说明](../../../../../../docs/database-migrations.md)。

旧版本升级必须确认起始结构、在备份副本中定向演练。不能直接删除本目录，
也不能把这些 SQL 与 D1 中内容相同的文件合并或重编号。
