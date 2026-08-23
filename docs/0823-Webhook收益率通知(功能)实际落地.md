# Webhook 收益率通知实际落地

## 落地结果

已完成 Webhook 配置、美国财政部 30 年期国债收益率采集、每日 Cron 与飞书通知的代码闭环。

### Webhook 配置

- 新增 `base_webhook_config` 模型、全量 DDL、Node 增量迁移和 Wrangler D1 迁移。
- 生产 D1 使用 `0006_webhook_treasury_notification.sql` 创建表和任务，使用 `0007_webhook_menu_permissions.sql` 补齐动态路由所需菜单及四项权限。
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
- Worker 的 `scheduled` 入口会先初始化应用单例和跨领域服务注册中心，保证 Cron Trigger 即使先于 HTTP 请求到达，也能调用 Webhook 通知服务。

### 财政部任务与 Cron

- 任务键：`us_treasury_30y_yield`
- 数据源：`https://home.treasury.gov/sites/default/files/interest-rates/yield.xml`
- 解析最新 `G_NEW_DATE` / Atom `entry` 中的 `BC_30YEAR`。
- Cron：`0 1 * * *`，在 Cloudflare Workers UTC 时区为上海时间每天 09:00。
- D1 与 Node 增量迁移会幂等写入公开的 API Task 和 Cron 配置。

## 与计划的差异

- 用户提供的飞书 Webhook URL 未写入源码或迁移，避免进入 Git 历史；生产发布后仅通过新管理页写入运行时数据库。
- 未执行真实飞书消息发送，避免在未确认测试消息内容和接收范围时产生外部通知；使用独立执行器集成测试验证了调用参数和通知正文。
- 首轮生产发布发现远程 D1 缺少新增菜单与权限，动态路由把页面重定向到 404；新增幂等的 `0007` 迁移并重新发布，保留最新 `dev` 的移动设备运维能力。
- 生产验收又从 Cron 日志发现首次 scheduled 事件未初始化 `ServiceRegistry`；复用 HTTP 入口的应用单例初始化流程，并新增 scheduled 启动回归测试后再次发布。

## 验证结果

- 合并到最新 `dev` 后，服务端构建和 Admin、Enterprise、Personal 三套生产构建全部通过。
- 修复后的完整后端测试：68 个测试文件，361 项通过、3 项跳过；服务端 TypeScript 构建通过。
- 新增通知与迁移相关测试在合并后为 5 个测试文件、18 项全部通过。
- 官方财政部实时 XML 验证：成功解析 `2026-08-21` 的 30 年期收益率 `5.27%`。
- `pnpm run db:generate` 已执行并生成 `base_webhook_config` DDL。
- 服务端和管理端相关文件 ESLint 通过。
- Webhook 密钥扫描无匹配，用户提供的 Hook Token 未进入工作区文件。
- 远程 D1 迁移、结构合约、Worker、系统 Schema 与三套 Pages 均通过生产流水线发布。
- 生产管理页已写入一条启用且为主配置的 `feishu` Webhook；页面只显示脱敏地址，D1 验收只读取 URL 长度和非敏感字段。

## 已知边界与后续建议

- 生产已启用 `us_treasury_30y_yield` API Task 与每天 09:00（上海时间）的 Cron；真实 Webhook 配置只存在于运行时 D1，未进入 Git。
- 未主动发送真实飞书测试消息；下一次定时触发会进行修复后的首次真实通知验收，首条失败日志保留用于生产问题追踪。
- `dist/renrui.sh` 含 Authorization、Cookie 和 JSESSIONID，仍未传入生产；其每 7 天任务需要单独确认凭据传输范围。
