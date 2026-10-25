# Cloudflare 用量 D1 发布修复

基线：`main / e68a3edecd509e801344092f2d810833ef7cc394`。分支：`codex/cloudflare-usage-d1-publish`。

## 已确认原因

线上调度记录为普通异常及安全分类 `D1_ERROR`，不是 CPU 终止。持久 cursor 停在最后一个 adapter 之前，且租约换代后没有分窗进度，原因不能仅由 `running` 状态判断。

将已保存的规范化 cursor 回放到全新本地原生 Workerd/D1，得到 `D1_ERROR: too many terms in compound SELECT`。原发布历史批次用 14 个 `SELECT` 通过 `UNION ALL` 组成派生表；相同原生运行时中，5 行成功、6 行起失败。线上规模的 8 份已暂存快照、159 条历史也稳定失败。

回放的 SQL 最多 89 个绑定参数、996 bytes，最大字符串参数 11,308 bytes，因此不是 100 参数、100KB SQL 或 2MB 行大小限制。整个发布 batch 的 24 条语句也不能直接等同于 24 次 Worker query；[D1 官方限制](https://developers.cloudflare.com/d1/platform/limits/)明确说明 batch 整次只计一次 invocation query。

原 D1 发布测试仅覆盖少量历史行，没有跨越实际 6 个 compound terms 的边界；普通 SQLite 和 PostgreSQL 通过也不能替代原生 D1 的边界验证。这是上一轮覆盖不足。

## 实际修改

- 历史派生表改用 `VALUES (...), (...)`；仍为每批 14 行，最多 89 参数。保留 `dayUtc` 的 `BIGINT` 转换、外层 fencing `WHERE EXISTS`、`ON CONFLICT`、单次原子 batch 和 90 天清理。[SQLite 官方说明](https://www.sqlite.org/lang_select.html#the_values_clause)指出多行 `VALUES` 不受 compound SELECT terms 限制。
- 仅在最终 publish 外增加异常处理：输出固定安全 cause 分类和 `stage=publish`，不记录 SQL、账户、参数或业务行；使用同一 job、同一 lease 的 fenced `repository.fail` 持久化退避，最多退避 15 分钟。
- `fail` 返回 false 时报告 fenced；`fail` 自身异常继续交由现有 scheduler 处理。失败时保留数据库里原来的 cursor，**不会声称最终 adapter 的内存结果已 checkpoint**；下一次到期执行会重算最后一步并幂等发布。
- 未改变 API、表结构、配额规则、部署配置或其他业务调度。

## 验证与边界

- 修复后，相同规范化材料的本地原生 D1 回放成功，159 条历史全部发布；仍为 24 条 SQL、最多 89 参数，SQL 最大 833 bytes，没有扩大语句数量。此回放仅验证已有暂存快照的发布，不发送真实 Cloudflare API 请求。
- 新增 6、14、15、31、159 行边界，包含 null 用量；SQLite、原生 D1、真实隔离 PostgreSQL 均通过。
- 新增后一批历史失败时整批回滚，以及发布失败后持久退避、到期使用同一 job 重放且不重复快照的回归。
- Node 定向 25 项通过（另 8 项 PostgreSQL 默认跳过）；Worker/D1 定向 21 项通过；新建 loopback PostgreSQL fixture 的 8 项单独通过。应用 TypeScript、ESLint、Prettier、差异检查通过。
- 完成两轮复核。新增但未修复的 TypeScript 报错：无。

生产写入、PR/CI、合并与部署由后续发布流程执行；本说明不宣称线上已成功回填。后续验收应观察同一 job 的发布结果、快照/历史数量，以及安全 publication failure 事件和退避状态。
