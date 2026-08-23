# AutoJS6 Wi-Fi/中国电信网络分流 V1 实际落地

## 边界

- 新能力使用 `device.network.routing.apply` 与 `device.network.routing.disable`，不改变旧 `device.network.switch` 的请求和执行行为。
- Node Server 是唯一持久分流控制面；PC 接口只代理 Node Server，不提供 MQTT 直连回退。
- 策略按设备保存。业务内网固定走 Wi-Fi，Internet 出口可选 Wi-Fi 或默认数据卡为 `46011` 的中国电信。
- 分流启用或状态未知时，旧网络切换在服务端与手机端均拒绝执行。

## 数据与接口

新增 D1 表 `admin_mobile_network_routing`，保存配置修订、generation、期望/实际出口、状态、最近任务、错误和验证时间。`active_task_client_id` 唯一索引确保单设备只能有一个未终结分流任务。

管理 API 均为 POST：

- `/api/v1/admin/mobile/network-routing/get`
- `/api/v1/admin/mobile/network-routing/update`
- `/api/v1/admin/mobile/network-routing/apply`
- `/api/v1/admin/mobile/network-routing/disable`

`apply` 与 `disable` 只创建异步任务并立即返回 `taskId`、`generation` 和过期时间。MQTT/HTTPS 结果处理器根据结果内的 generation 做幂等状态更新；读取控制面时会对服务端已终结但后处理未完成的任务执行恢复。

## 手机执行

Termux Node 客户端直接执行结构化白名单动作，不启动 AutoJS，也不开放任意 shell。执行器会：

1. 从 `dumpsys connectivity`、`ip route` 和 `ip rule` 动态识别接口、netId 与 Android 路由表。
2. 要求 Wi-Fi、蜂窝均为 `CONNECTED + VALIDATED`，移动数据和 `mobile_data_always_on` 已启用；蜂窝目标额外校验默认数据卡 MCC/MNC 为 `46011`。
3. 拒绝活动 VPN；先分别绑定 Wi-Fi/目标接口执行探针，失败不修改路由。
4. 在受管优先级 `10400-10699` 写入显式绑定接口保护、管理直连保护、LAN 到 Wi-Fi 和未绑定 Internet 到目标出口规则，并通过 netd 设置默认 Network。
5. 目标缺少 IPv6 默认路由时写入专用不可达表，阻止从另一个网络回落泄漏。
6. 重建管理 MQTT 连接，使用未绑定探针验证全设备真实路径；失败恢复先前健康策略或原默认 netId，并将任务保持为失败。
7. 将成功策略原子写入 `AUTOJS6_SHARED_STATE_DIR/network-routing/state.json`，启动时恢复；`ip monitor link address route` 实时触发去抖后的自愈，每分钟巡检作为兜底。自然断网只标记 `DEGRADED`，不切换出口。

探针结果只回传成功状态、接口名、策略修订和回滚信息；公网 IP 只在进程内校验，不进入任务结果和日志。

## IP 变化自愈与状态上报

- 蜂窝公网 IP 或本机地址变化不会直接使策略失效，规则绑定当前接口和 Android 路由表，不绑定具体 IP。
- 网络变化时状态先进入 `RECOVERING`，重新识别 Wi-Fi/蜂窝接口、netId 和路由表；规则漂移时重建规则，随后强制重连管理 MQTT，并复验 LAN 与 Internet 出口。
- 恢复成功回到 `ACTIVE`；目标网络或探针仍不可用时进入 `DEGRADED`，等待下一次网络事件或周期巡检，不自动切换到另一出口。
- 手机向 `autojs6/v2/devices/{deviceId}/network-routing/status` 发布 QoS 1 retained 状态，同时向 `/admin/mobile/device/report/network-routing` 发送同载荷 HTTPS 回传。生产 Worker 因此不依赖常驻 MQTT 订阅。
- 服务端只接受与当前设备 generation 精确匹配的状态；旧 retained 消息不会覆盖新策略。状态载荷只包含策略修订、接口名、错误码和验证时间，不包含公网 IP。

## 页面与 PC 兼容层

设备详情新增“网络分流”页签，可编辑 CIDR、LAN/Internet 探针和超时，选择 Wi-Fi/中国电信，查看期望/实际出口、状态、任务、错误与回滚结果，并通过 MUI Dialog 停用分流。页面只使用 Snackbar/MUI 对话框，无原生 `confirm/alert`。

PC 新增：

- `/api/network-routing/get`
- `/api/network-routing/apply`
- `/api/network-routing/disable`

旧 `/api/network/switch` 保持原样。

## 已执行验证

- mobile：类型检查和全套测试通过；覆盖参数/CIDR、动态网络解析、切换前无修改失败、成功应用、generation、切换后失败回滚、回滚失败、持久恢复、漂移修复和停用。
- Node Server：领域规则、可信任务与迁移测试通过；Node 生产构建与 Wrangler Worker dry-run 通过；本地 D1 `0005_mobile_network_routing.sql` 应用成功。
- Admin：OpenAPI 类型已重新生成，TypeScript 和 Vite 生产构建通过，原生弹窗扫描通过。
- PC：类型检查和全套测试通过。

## Pixel 5 金丝雀

2026-08-23 使用默认拒绝运行、需显式设置 `AUTOJS6_ROUTING_DEVICE_CANARY=1` 的受控设备测试器完成真机验收：

- Wi-Fi netId 109 与中国电信蜂窝 netId 108 同时保持 `CONNECTED + VALIDATED`，默认数据卡为 MCC/MNC `46011`。
- 两个 LAN 探针经 Wi-Fi 均返回 302；Wi-Fi 与蜂窝探针均返回有效公网 IPv4，且出口不同，公网 IP 未写入输出或日志。
- 切到蜂窝后，两个 LAN 目标仍由 Wi-Fi 到达，未绑定 Internet 流量使用蜂窝，IPv6 使用蜂窝路由表。
- 切回 Wi-Fi 后，未绑定 Internet 流量恢复 Wi-Fi；因 Wi-Fi 没有 IPv6 默认路由，专用不可达表生效。
- 停用后恢复 Android 默认出口，并确认 IPv4/IPv6 的 `10400-10699` 受管规则全部删除。
- 故障注入在蜂窝切换完成后强制后置 Internet 探针失败，返回 `NETWORK_ROUTING_ROLLED_BACK`，规则与默认出口均成功恢复。

本次 ADB 管理链路使用 Wi-Fi TCP，而非原计划中的 `bt-pan`；LAN 保护规则使整个切换过程 ADB 保持在线。此次受控测试执行了与手机客户端相同的路由管理器，但尚未通过已发布手机客户端从 Node Server/MQTT 下发，因此 MQTT 任务回传、客户端重启恢复仍需在发布金丝雀版本后完成端到端验收。
