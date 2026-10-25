# Cloudflare 账号用量面板

首页对所有登录用户开放。只有 `admin.maintenance.cloudflare_usage:read` 可以读取账号统计与费用；`admin.maintenance.cloudflare_usage:update` 可以请求刷新。新增权限默认只授予超级管理员角色，其他角色需显式授权。

## 凭据与配置

为同一个账号分别建立两枚 account-owned 只读 Token：

| 配置名                     | 作用                       |
| -------------------------- | -------------------------- |
| `CF_USAGE_ACCOUNT_ID`      | 统计目标账号，32 位账号 ID |
| `CF_USAGE_ANALYTICS_TOKEN` | Account Analytics: Read    |
| `CF_USAGE_BILLING_TOKEN`   | Billing: Read              |

生产通过 Worker Secret 或 Node 的私有环境配置注入。不要复用部署 Token、AI 推理 Token，或将私有 `usage.env` 加入 Git、前端构建变量或普通日志。Token 有效期由账号管理员管理，到期后更新 Secret。缺配置时页面显示未配置；这三个字段不是其他业务运行的必填项。

首次使用 Cloudflare Llama 3.2 11B Vision，须由账号用户在 Cloudflare 模型页面自行阅读并接受许可。应用不会代为接受协议。用量凭据不用于推理。

## 保留数据的升级

先备份并暂停相关写入，在部署新版前完成数据库升级。禁止通过 reset 或重建数据库安装这个功能。

- **D1**：沿用 Wrangler 编号迁移，新增 `0018_cloudflare_usage.sql` 和 `0019_cloudflare_usage_metadata.sql`。前者增加三张表及结构校验，后者只增加这次的权限和后端翻译、为角色 1 增加缺失授权并更新其权限计数。迁移后执行现有 Worker 结构契约检查。
- **已有 Node SQLite**：在 `server/` 执行 `pnpm run db:migrate:cloudflare-usage:node --database=<本地现有 SQLite 文件绝对路径>`。该命令将结构、种子和成功标记放在同一事务内；重复执行检查 checksum 与结构，不重复授权；失败回滚。已有用量表但缺本工具标记时拒绝自动接管，需要先核对建表来源。
- **PostgreSQL**：现有 `db:migrate:postgresql` 按顺序应用 `0001_core_enterprise` 与新增 `0002_cloudflare_usage`。历史 SQL/checksum 不变，旧库先校验原结构指纹再升级。按 [PostgreSQL 部署说明](./postgresql.md) 运行增量迁移及现有种子同步流程，执行前先查看 check 模式结果。
- **全新数据库**：全量结构 DDL 已包含三张新表，仍使用仓库的新库安装流程。全新 SQLite 的全量结构安装与旧库的专用迁移是两个入口，不要混用账本。

三张表分别保存最近成功来源快照、90 天逐日历史、任务状态及 cursor。定向生成检查为 `pnpm run db:generate:cloudflare-usage`；`--write` 只更新三份新库 DDL 和两份结构契约，不写历史编号迁移。

## 数据口径和覆盖

费用来自官方返回的按量费用，按币种和账期分组。它不等于含固定费、税费和调整项的最终发票；不使用本地价格表反推费用。V2 计费 API 为 Alpha/受限接口，账号可能无法使用。此时探测 V1 的官方能力，保留来源、覆盖状态和缺失原因。

通用计量不按产品白名单过滤。Analytics 只给已验证的数据集和字段增加指标；不把 CPU 分位数当累计 CPU、GB 当 GB-month、消息数当计费操作数、应用 token 当 Workers AI neurons。Workers 和 Pages Functions 的共享额度只计算一次。套餐不明、定制额度或单位/周期不匹配时，额度、剩余和百分比保持 `null`。

配额规则在 `rules.ts` 保存官方依据、规则版本和生效日期。页面对已确认的额度显示 80%/100% 提醒，区分内含量与硬限制。每日、订阅账期、自然月和当前容量不混算。历史缺口不补零，累计快照不能冒充逐日新增量。

分钟调度独立于可编辑的业务 Cron 配置，按 15 分钟周期申请任务；未完成任务使用持久 cursor 续跑。刷新请求合并到当前任务并按账号限流。来源失败保留上次成功值，页面显示过期状态和失败覆盖；HTTP 200 中的 GraphQL errors 同样按失败处理。分页和有界窗口未完成时不发布完整快照。

## 接口与运行检查

所有接口使用 POST，位于 `/api/v1`：

| 路径                                           | 权限                                                    |
| ---------------------------------------------- | ------------------------------------------------------- |
| `/admin/ai/chat/models`                        | `admin.ai.chat:read`                                    |
| `/admin/ai/chat/ask`                           | `admin.ai.chat:read`，可选 `modelKey`，兼容原字符串响应 |
| `/admin/maintenance/cloudflare-usage/overview` | 用量 `:read`                                            |
| `/admin/maintenance/cloudflare-usage/refresh`  | 用量 `:update`                                          |

PostgreSQL 仅新增开放用量模块的两个路由，没有开放未适配的 AI 模块。面板统计请求与 AI 推理请求相互独立。

验收时分别记录代码/模拟测试、真实账号只读对照、线上部署结果。能力探测成功、模拟截图或构建通过都不等于线上验收通过。

参考：[Cloudflare 账号 Token](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)、[官方计费 V2](https://developers.cloudflare.com/api/resources/billing/subresources/usage/methods/get_account_usage_v2/)、[视觉模型许可及接口](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/)。
