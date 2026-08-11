# AutoJS6 任务优先级与结果兜底详细设计

## 背景

现有 AutoJS6 v2 任务在手机端按 FIFO 串行执行，PC 独立模式的设备选择、结果校验与超时处理不足；HTTP callback 失败时虽然手机也发布 MQTT 结果，但 Node Listener 使用临时 clean session，进程短暂离线期间的结果无法补送。

## 设计

1. v2 请求增加可选 `priority` 与 `preemptRunning`。优先级为 `LOW/NORMAL/HIGH`，网络切换默认 HIGH，其余默认 NORMAL；旧请求按默认值解析。
2. 手机队列按优先级和入队顺序调度。显式抢占只在新任务优先级不低于运行任务时生效，被抢占任务以 `CANCELLED/PREEMPTED_BY_TASK` 结束且不重跑。队列满时，HIGH 可淘汰最低优先级中等待最久的任务。
3. 手机结果先写本地 outbox，再并行发送 MQTT QoS 1 与带设备令牌的 HTTP callback；任一可信通道确认后清除，重连或重启时重放。
4. Node 使用稳定 clientId、持久 MQTT session 和 QoS 1 订阅结果；Worker 不建立长期连接，只处理 HTTP callback 与 scheduled 超时扫描。服务端在任务过期后保留30秒结果投递宽限。
5. PC 接口使用 Bearer Token；Node Server 配置存在时作为权威任务中心。独立模式只使用外部认证 MQTT，不允许本地 Aedes 执行网络切换。
6. Node Server 任务表持久化优先级、抢占开关和抢占来源，管理页面支持展示、筛选和排序。

## 安全边界

- MQTT 结果必须同时匹配 Topic、taskId、deviceId、scriptId 与 traceId；未知或已终态任务忽略。
- HTTP callback 必须通过目标设备的上报令牌认证。
- PC 不再使用 MQTT 用户名推断设备，不记录真实设备标识。
- 明确配置的手机脚本白名单可以收紧默认目录。
- `preemptRunning` 默认关闭；调用方显式启用即接受运行中脚本可能已有不可回滚副作用。

## Node/Worker 兼容

- Node 入口启动 MQTT Listener 和内存定时扫描。
- Worker scheduled 仅调用数据库超时与清理逻辑；结果通过 HTTPS callback 到达。
- 共用同一幂等结果处理函数，双通道不会覆盖第一次终态。
