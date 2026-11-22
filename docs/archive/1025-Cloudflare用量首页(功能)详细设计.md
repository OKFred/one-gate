# Cloudflare 用量首页与 AI 对话统一：详细设计

## 基线与实施顺序

- 基线：`main` / `94318dc476197c4163d5f516c3456446f1de0099`。
- 开发分支：`codex/cloudflare-usage-dashboard`。
- 先统一 `/admin/ai/chat`，再用 Cloudflare 总览替换首页。首页 `/home` 仍对所有已登录用户开放，数据区独立鉴权。
- 本轮不修改线上数据库或部署；真实账号验收只读取 Cloudflare 数据。代码、模拟测试、真实账号和上线结果分别记录。

## AI 对话合同

`POST /api/v1/admin/ai/chat/models` 使用现有 `admin.ai.chat:read`，无请求参数，返回：

```ts
interface ChatModelCatalog {
  defaultModelKey: string | null;
  models: Array<{
    modelKey: string;
    label: string;
    providerKind: 'cloudflare' | 'openai_compatible';
    capabilities: Array<'text' | 'image'>;
    available: boolean;
    unavailableReason: string | null;
    isDefault: boolean;
  }>;
}
```

- `/ask` 保持 `{q,image?,history?}` 和字符串响应，新增可选 `modelKey`。当前问题不进入 `history`；欢迎语和错误提示不进入推理上下文。
- 服务端生成受控 descriptor；配置型 key 绑定配置修订。默认选择先兼容当前可用 CF binding，再采用启用的主系统配置，最后采用已配置的 CF REST。确定 descriptor 后只调用一次，不在失败后切供应商、切模型或自动重试。
- CF 文字默认 `@cf/meta/llama-3.2-3b-instruct`；视觉为 `@cf/meta/llama-3.2-11b-vision-instruct`。系统配置仅暴露已启用且实际支持 OpenAI-compatible 协议的聊天项，过滤 embedding，不暴露 URL/key。不得将原生 Anthropic 配置误当兼容协议。
- 当前和历史共同最多一张 PNG/JPEG，解码最大 5 MiB，仅 data URI；验证文件签名、实际类型和大小，不增加远程抓图。含图片时必须选择支持图片的 descriptor；换图要求新对话，不静默丢图。视觉模型许可由用户接受，不发送自动同意请求。
- 重试绑定原提问、附件和模型 key；清空/离页/身份变更取消本地等待并用代际保护拒绝旧回填，双击不重复提交。网络中断不声称服务端推理已取消。错误采用局部展示，401/TOTP 仍交给共享请求层。
- 统一图片预览、Markdown/代码块、复制、重试、新对话、展开和快捷问题。聊天状态不持久化。现 OpenAI-compatible 外部 API 合同不扩展，PG 未适配 AI 路由仍关闭。

## Cloudflare 用量数据合同

业务域：`admin.maintenance.cloudflare_usage`；路由：`/api/v1/admin/maintenance/cloudflare-usage`。

- `POST /overview` 请求 `{days?: 7 | 30}`，返回 account/configuration、metrics、costs、history、coverage、sync 和 collectedTimeUtc。
- `POST /refresh` 请求 `{}`，返回 `{accepted,jobId,eligibleTimeUtc,state}`；只登记任务，不在交互请求中跑完整采集。
- 读取用量及费用使用 `:read`；登记刷新使用 `:update`，默认仅给超级管理员角色。普通首页不发 CF 请求，AI 快捷入口继续按聊天权限显示。

核心 DTO 字段：

```ts
interface UsageMetric {
  id: string;
  product: string;
  name: string;
  unit: string;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  percentage: number | null;
  periodKind: 'day' | 'billing_cycle' | 'calendar_month' | 'instant';
  periodStartUtc: number | null;
  periodEndUtc: number | null;
  resetTimeUtc: number | null;
  quotaKind: 'included' | 'hard' | 'capacity' | 'unknown';
  source: string;
  quality: 'exact' | 'estimated' | 'reference' | 'unknown';
  status: string;
  reason: string | null;
  collectedTimeUtc: number;
}
```

- cost：`id/product/currency/amount`（十进制字符串）、`periodStartUtc/periodEndUtc/source/status`；仅官方按量费用，不冒充最终账单，不合并不同币种。
- history：`metricId/dayUtc/value/kind/source`；kind 为 `daily_usage` 或 `cumulative_snapshot`，不将累计快照伪装为当日消耗。
- coverage：`product/status/reason`；区分 API 未开放、无权限、未配置、规则未映射和数据过期。
- sync：`state/jobId/lastSuccessTimeUtc/nextRunTimeUtc/retryTimeUtc`；state 为 `idle/pending/running/partial/failed/complete`。
- configuration 为 `missing/partial/configured`；account 为 `{id,name}` 或 null。前端以最终 OpenAPI 类型为准，禁止手工复制类型。

## 数据源和计量边界

- 固定 `https://api.cloudflare.com/client/v4`，服务端独立 Secret：`CF_USAGE_ACCOUNT_ID`、`CF_USAGE_ANALYTICS_TOKEN`、`CF_USAGE_BILLING_TOKEN`；Token 不入库、不回传、不覆写现 AI 推理 Token。
- 两枚指定账号 account-owned Token 分别只授 Account Analytics Read 与 Billing Read；不使用 Global API Key、不为了资源名称读取业务内容。
- 先读订阅、coverage/anchor，探测受限 V2 的 usage/cost，再按能力使用 V1；GraphQL schema/settings 和产品适配补免费量、当日与趋势。记录能力，不将 403 一律当凭据错误。
- 所有官方返回 meter 均规范化展示，不按产品白名单丢弃。Workers/Pages Functions、D1、KV、R2、Queues、Workers AI、DO、Browser Run 采用显式产品适配；无法权威计算的字段保持 null。其他 meter 仍展示官方名称、数量、单位、周期及费用。
- 规则带版本、生效日、官方依据；未知套餐/定制套餐不得套通用限额。不提供手工配额。共享额度池不得重复累计。
- 不用 CPU 分位数乘请求数；不把当前 GB 当 GB-month；不把队列消息数当分段计费 operations；不把应用 token 日志当全账号 Neurons。V1 空结果、截断分页和缺失范围均不视为 0。
- 缺少可靠账期时仅显示自然月参考量，不声称官方账期剩余。80%/100% 仅对可信额度计算，明确内含量与硬上限。

## 持久化和调度

- 使用模块专用最近成功快照、90 天逐日历史及同步状态，提供 SQLite/D1 和 PostgreSQL repository。所有业务默认值由服务端显式赋值，SQL 不增加默认值。
- 15 分钟创建/合并一个持久采集 job；Worker/Node 的每分钟入口处理有界批次和续跑，不开启整个 PG business Cron。分钟调度 runId 和业务 jobId 分开。
- 租约包含 owner/generation/expiry，续租、cursor、发布均条件校验 fencing；外部 HTTP 不在数据库事务内。分页结果和 cursor 原子落库；未覆盖完整统计窗口不发布完整快照。
- 手动刷新与当前任务合并，按账号限流。账号 ID 纳入所有持久键，Secret 改账号后不读取旧账号快照。
- 来源独立失败，保留成功快照并标 stale；识别 HTTP200 GraphQL errors、429/retry-after、超时和不完整覆盖。失败退避，不能每分钟无界重试。
- 调度记录数量、成功/失败、延迟、积压及耗时；HTTP 使用 metadata-only，不保存凭据、原始账单、完整问答和图片。
- 编号增量迁移、定向 DDL 和 PG capability 白名单共同更新；新库初始化/结构契约同时同步，保留线上历史数据。

## 验证

- AI：选模/默认、修订冲突、当前和历史图片能力、文件校验、重试快照、无重复当前问题、双击、迟到响应、错误一次、旧合同和权限。
- 数据：单位/周期/币种、共享池、未知项、采样、迟到数据、分页截断、部分权限、HTTP200 errors、429、Secret 改账号。
- 调度/存储：三数据库、两个运行时、并发租约和 fencing、任务合并、失败续跑和90天清理。
- UI：权限与空态、7/30天、亮暗/移动端、80/100阈值、只读角色不可刷新、费用与未知额度；认证测试从首页聊天迁至 AI 页面。
- 真实账号：只读对照官方控制台，记录每项来源和覆盖边界；没有凭据或许可时明确未验收，不用 fixture 替代。

## 官方依据（2026-10-25 核验）

- https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/
- https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/
- https://developers.cloudflare.com/analytics/graphql-api/
- https://developers.cloudflare.com/api/resources/billing/subresources/usage/methods/get_account_usage_v2/
- https://developers.cloudflare.com/api/resources/billing/subresources/usage/methods/get_account_usage_v1/
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/
