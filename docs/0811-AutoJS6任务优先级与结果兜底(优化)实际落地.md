# AutoJS6 任务优先级与结果兜底实际落地

## 已落地范围

- v2 任务增加 `LOW/NORMAL/HIGH`、`preemptRunning` 和 `preemptedByTaskId`；网络切换默认 HIGH，其余默认 NORMAL。
- 手机队列按优先级与 FIFO 调度，支持显式同级/高优抢占、满队列 HIGH 淘汰和稳定取消原因。
- 手机终态在发送前原子写入 outbox，同时尝试 MQTT QoS 1 和带设备令牌的 HTTP callback；任一可信通道确认后删除，重连和进程重启会重放。
- Node MQTT 结果消费者采用稳定 clientId、持久会话和 24 小时 session expiry；Worker 不建立 MQTT 长连接。
- Node Server 在 `expiresAt + AUTOJS6_RESULT_GRACE_MS` 后写入服务端超时，默认宽限 30 秒。
- PC 在配置 Node Server 时以其为权威；独立模式仅允许外部认证 MQTT，按 PUBACK 确认下发，并严格关联 Topic、设备、任务、脚本与 traceId。
- PC HTTP 控制、查询和屏幕 WebSocket 均要求 `ONE_AUTOJS6_API_TOKEN`；HTTP 设备结果要求设备上报令牌。
- `device.network.switch` 已加入三端可信脚本目录。网络检测最长 120 秒，任务最长 150 秒；PC/Node 下发时额外预留 20 秒，手机最终执行端要求至少保留 15 秒恢复和回传窗口。
- 管理端异步任务页增加优先级筛选、排序、抢占标记和抢占来源展示。
- 两个仓库补充 LF/UTF-8 规范；`pc/ws-scrcpy` 的 245 个纯换行修改已还原。

## 数据库与接口

- `admin_mobile_async_task` 新增 `priority`、`preempt_running`、`preempted_by_task_id`。
- 三个独立迁移已在本地数据库成功执行，旧记录的优先级回填为 NORMAL，抢占默认关闭。
- OpenAPI 已从最新 Node 服务重新生成，前端类型包含新增字段。
- HTTP/MQTT 结果共用同一幂等处理逻辑；未知任务或 deviceId、scriptId、traceId 不匹配的结果不会完成任务。

## 验证结果

| 验证项 | 结果 |
| --- | --- |
| 手机队列/协议单测 | 通过：优先级、FIFO、抢占条件、淘汰、全 HIGH 拒绝、旧请求默认值、非法优先级 |
| PC 结果校验单测 | 通过：缺失/非法状态、伪造 Topic 设备、deviceId、taskId、scriptId、traceId、重复终态 |
| PC TypeScript 与运行时启动 | 通过；同时修复 Node 24 下 Aedes CommonJS 导入问题 |
| PC HTTP/屏幕 WebSocket 认证 | 通过：无令牌拒绝，正确令牌放行 |
| Node 构建 | 通过 |
| Admin 前端构建 | 通过 |
| Worker 类型检查 | 本次修改文件无新增错误；仓库仍有 10 个既有严格类型错误，分布在 AI 配置、初始化、Docker、系统用户、权限初始化和个人配置模块 |
| ADB 普通任务 | `device.apps.list` SUCCESS，MQTT 结果正确关联 |
| ADB 网络切换 | Wi-Fi SUCCESS；无可用蜂窝时返回 `FAILURE/NETWORK_UNAVAILABLE`，恢复原 Wi-Fi，并在断网重连后收到真实终态而非 SERVER_TIMEOUT |
| ADB 显式抢占 | 原任务 `CANCELLED/PREEMPTED_BY_TASK` 且记录抢占任务 ID；新 HIGH 任务 SUCCESS |
| 手机 outbox | 断网重连后重放成功，测试结束 outbox 为 0 条 |
| 设备上报 | 观察到 retained Info、60 秒 Presence、网络/电量变化事件及 MQTT Will OFFLINE/重连 ONLINE |
| 网络恢复 | 测试结束 Wi-Fi 和移动数据均恢复为开启 |

## 已知说明

- 蜂窝网络在当前实机环境不可用，所以失败路径和恢复路径得到验证，未得到蜂窝成功路径；Wi-Fi 成功路径已验证。
- MQTT Broker/设备网络在测试期间发生多次短暂 DNS 断开，正好覆盖了 outbox、持久会话和 Will 的恢复场景。
- 显式抢占仍可能发生不可回滚副作用，TikTok、安装、下载、更新和网络切换调用方必须明确承担该风险。

## 与计划的差异

- 多改：将 `/api/screen` WebSocket 一并纳入 Bearer Token 边界，避免控制接口受保护但屏幕数据仍可匿名读取。
- 多改：实机发现网络检测结束、恢复网络和 MQTT 重连之间需要独立窗口，因此增加“检测最长 120 秒、任务最长 150 秒、下发预留 20 秒、执行端至少保留 15 秒”的约束。
- 多改：将三端 MQTT 客户端明确切换到 MQTT 5，确保 session expiry 属性实际生效。
- 少验证：当前 SIM/运营商环境没有可用蜂窝数据，无法验证蜂窝成功分支；失败恢复、Wi-Fi 成功、断网结果回传和抢占均已验证。

## 后续建议

- 在具备可用蜂窝数据的设备上补跑一次 carrier 成功路径。
- 修复 Worker 严格类型检查中的 10 个既有错误，再将 Worker 类型检查设为强制 CI 门禁。
- 多设备上线前为每个部署显式配置唯一 `AUTOJS6_MQTT_RESULT_CLIENT_ID`，并在 Broker 侧限制设备账号只能发布自己的 Presence、Info、Event 和 Result Topic。

本次修改没有新增未处理的 TypeScript 错误。
