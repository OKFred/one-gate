# AutoJS6 任务优先级与结果兜底计划变更

## Node Server

- 扩展异步任务模型、DDL 与增量迁移：`priority`、`preempt_running`、`preempted_by_task_id`。
- 扩展 dispatch/list 协议、可信脚本目录和网络切换参数校验。
- MQTT Listener 改为稳定持久 session；超时扫描增加30秒结果宽限。
- HTTP callback 改用设备令牌认证。
- 管理端异步任务列表增加优先级筛选、排序、抢占标识和中断来源展示。

## One AutoJS6

- 扩展 v2 协议与手机优先队列，实现显式抢占、队列淘汰和结果 outbox。
- PC 兼容层增加 API Token、严格结果校验、可靠超时、在线设备选择及外部 MQTT 限制。
- 完善网络切换参数校验、测试脚本和 Swagger。
- 增加根级 AGENTS/LF 规则，还原纯换行改动。

## 验证

- PC、Mobile、Node、Worker TypeScript 与构建检查。
- 队列排序、抢占、淘汰、结果幂等、超时宽限和认证测试。
- MQTT 断线重连与 HTTP callback 失败兜底测试。
- ADB 实机网络切换、抢占和结果回传测试。
- ESLint/Prettier、JS 语法与 `git diff --check`。
