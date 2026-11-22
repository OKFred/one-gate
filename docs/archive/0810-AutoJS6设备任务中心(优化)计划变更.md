# AutoJS6 设备任务中心计划变更

## 1. 变更范围

### Node Server

1. 扩展异步任务模型与 DDL，保存 v2 协议、参数、统一结果和执行时间。
2. 在异步任务模块增加通用 `dispatch/get` API、发布函数、结果处理函数和超时扫描。
3. MQTT Listener 订阅按设备隔离的 v2 事件、结果和 Presence Topic，并保留旧事件 Topic 兼容。
4. 设备应用同步/安装改为调用 `device.apps.list` 与 `app.install`，不再拼接或下发源码。
5. 增加 `admin.mobile.async_task:dispatch` 权限种子，修复本次触及模块中的 `as any`。

### one-autojs6 手机端

1. 新增 `autojs6-config.example.json` 及配置解析、默认值和安全边界。
2. 新增 v2 协议类型、可信脚本注册表和本地任务脚本目录。
3. 重构 MQTT 客户端：仅订阅本设备 v2 Topic，旧 Topic 由配置显式开启。
4. 统一队列、超时、结果格式、清理行为和 Presence/能力上报。
5. 新增通知监听脚本，现有电量、网络、短信监听改为 JSON 配置驱动。
6. 将设备应用列表、应用安装、TikTok 发布脚本纳入手机本地注册表。

### one-autojs6 PC 兼容层

1. 新增 Node Server API 客户端，统一注入目标 deviceId、服务端地址和访问令牌。
2. TikTok、应用列表、版本检查、文件下载和应用更新入口改为下发可信 scriptId。
3. 通用任务入口拒绝原始 JavaScript/Shell；任务查询改为代理 Node Server。
4. PC 继续保留 Dashboard、SMB 代理和 ADB 投屏等本机能力，但不再承担设备任务状态中心职责。

### Node/Worker 分层

1. `mqtt/listener` 仅由 Node 入口导入，避免 Worker Bundle 静态包含 Node EventEmitter 和长期连接代码。
2. 增加公开但使用 taskId/deviceId/scriptId/traceId 四元组校验的 v2 HTTP 结果入口。
3. 任务可携带 callbackUrl；手机 MQTT 与 HTTP 双报，服务端幂等落库。
4. Worker `scheduled` 处理任务超时，Node 继续使用常驻扫描器。

## 2. 兼容方案

- 现有数据库列 `cat/script` 暂不删除；v2 任务只写分类与 `scriptId`，避免破坏旧环境。
- 旧设备回调 API 暂时保留，但新的手机客户端始终通过 v2 MQTT 结果 Topic 回传。
- v2 手机客户端不包含远程脚本/Shell 实现，也不订阅旧公共任务 Topic；旧 HTTP 回调仅供未升级设备过渡。
- 原 PC 脚本暂不删除，但控制器不再读取；待外部调用完成迁移后再单独清理文件。

## 3. 实施顺序

1. 建立设计文档与协议类型。
2. 实现手机配置、注册表、事件监听和 v2 执行器。
3. 实现服务端异步任务发布/落库/监听。
4. 迁移设备应用流程，开放通用可信脚本调度。
5. 更新 DDL/示例配置/README，并进行 TypeScript、格式化与定向测试。
6. 执行仓库代码审查流程，记录审查轮次和遗留问题。

## 4. 验收标准

- Node Server 下发内容中不存在脚本源码或任意 Shell 命令。
- 未注册的 `scriptId` 在手机端返回 `REJECTED/SCRIPT_NOT_ALLOWED`。
- 手机超时回传 `TIMEOUT`，服务端也能独立将过期任务标记为超时。
- 所有终态回调包含统一字段，服务端幂等落库。
- 两台设备使用不同 Topic，任务和结果不能串设备。
- 配置可分别开启/关闭 battery、network、sms、notification。
- `tiktok.post` 支持素材候选、标题池和详细描述池参数。
- 两个项目的定向 TypeScript 检查通过，或在实际落地文档中明确既有错误与本次差异。

## 5. 不在本次范围

- 管理后台完整任务/设备可视化页面。
- 动态脚本包上传、签名、灰度发布平台。
- 多任务并行执行（首版每台设备串行，优先保证 AutoJS6 UI 自动化稳定性）。
- 删除全部 PC 旧脚本；本次迁移所有 PC 任务入口，但保留脚本文件作为短期对照。
