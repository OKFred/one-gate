# Webhook 收益率通知实际落地

## 落地结果

已完成 Webhook 配置、美国财政部 30 年期国债收益率采集、每日 Cron 与飞书通知的代码闭环。

### Webhook 配置

- 新增 `base_webhook_config` 模型、全量 DDL、Node 增量迁移和 Wrangler D1 迁移。
- 新增 `/admin/base/webhook_config` 管理页与 `list/detail/add/update/delete` 接口。
- 字段包含 `source`、`url`、`isEnabled`、`isPrimary`、`remark` 及公共审计字段。
- 列表 URL 脱敏，完整 URL 仅通过需要 `edit` 权限的详情接口返回。
- 仅接受 HTTPS URL；来源统一转为小写；同来源设置新主配置时清除旧主标记。
- 新增业务键、菜单、权限种子、前端权限常量和中英文文案。

### 通知链路

- 在底座服务注册表新增 Webhook 通知服务。
- 首期支持飞书文本消息协议，同时兼容飞书两类成功响应字段。
- Webhook 请求使用 SSRF 防护和超时控制，但不接入会记录完整 URL 的 HTTP 审计日志，避免泄露 Hook Token。
- Cron 参数新增向后兼容的 `request` 与 `notification` 信封；历史参数仍按原逻辑执行。
- 采集成功后格式化并发送通知；采集失败或解析失败时发送失败摘要；通知失败会使 Cron 日志标记为失败。

### 财政部任务与 Cron

- 任务键：`us_treasury_30y_yield`
- 数据源：`https://home.treasury.gov/sites/default/files/interest-rates/yield.xml`
- 解析最新 `G_NEW_DATE` / Atom `entry` 中的 `BC_30YEAR`。
- Cron：`0 1 * * *`，在 Cloudflare Workers UTC 时区为上海时间每天 09:00。
- D1 与 Node 增量迁移会幂等写入公开的 API Task 和 Cron 配置。

## 与计划的差异

- 用户提供的飞书 Webhook URL 未写入源码或迁移，避免进入 Git 历史。目标环境完成部署和迁移后，需通过新管理页写入运行时数据库。
- 未执行真实飞书消息发送，避免在未确认测试消息内容和接收范围时产生外部通知；使用独立执行器集成测试验证了调用参数和通知正文。
- 本轮代码已按用户授权提交并推送；未部署、未应用远程 D1 迁移，也未写入真实 Webhook 配置或发送外部消息。

## 验证结果

- 改动前：服务端构建通过；管理端生产构建通过。
- 改动后：服务端构建通过；管理端生产构建通过。
- 新增相关测试：5 个测试文件、15 项测试全部通过。
- 官方财政部实时 XML 验证：成功解析 `2026-08-21` 的 30 年期收益率 `5.27%`。
- `pnpm run db:generate` 已执行并生成 `base_webhook_config` DDL。
- 服务端和管理端相关文件 ESLint 通过。
- Webhook 密钥扫描无匹配，用户提供的 Hook Token 未进入工作区文件。

## 已知边界与后续建议

- 生产环境尚未部署新表和接口，因此运行时 Webhook 记录、API Task 和每日 Cron 尚未在生产生效；代码推送本身不改变该边界。
- 旧的 `api-task.integration.spec.ts` 在独立运行时仍会命中仓库既有的无扩展名 `businessError` 别名解析问题；本次新增通知链路已由独立集成测试覆盖，且服务端构建无新增 TypeScript 报错。
- 部署后建议先写入 Webhook 配置，再手动执行一次 Cron 或 API Task 进行受控验收；真实测试消息发送前应确认接收群和消息内容。
