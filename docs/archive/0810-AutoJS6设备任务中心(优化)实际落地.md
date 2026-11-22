# AutoJS6 设备任务中心实际落地

## 1. 落地结论

本次已完成 AutoJS6 v2 设备任务中心首版。Node Server 不再向新手机客户端下发 JavaScript/Shell 源码，改为下发 `scriptId + params`；手机只执行本地注册表中的可信脚本。任务、结果、事件和 Presence 均按 `deviceId` 使用隔离 MQTT Topic。

## 2. 计划与实际对照

| 计划项                | 实际结果                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------ |
| 手机端可信脚本注册表  | 已完成，注册应用采集/安装/更新、文件下载、TikTok 发布与客户端自更新等 8 项可信任务         |
| v2 统一任务协议       | 已完成，包含协议版本、设备、脚本、参数、超时、有效期和 traceId                             |
| 统一结果与超时        | 已完成，支持 SUCCESS/FAILURE/TIMEOUT/REJECTED/CANCELLED、结果码、结构化数据和执行时间      |
| 服务端幂等落库        | 已完成，只允许 PENDING/RUNNING 首次进入终态，并校验 deviceId/scriptId/traceId              |
| 服务端独立超时        | 已完成，Node 常驻扫描、Worker scheduled 扫描并写入 TIMEOUT/SERVER_TIMEOUT                  |
| MQTT 多设备隔离       | 已完成，使用 `autojs6/v2/devices/{deviceId}/...`                                           |
| 可配置事件监听        | 已完成，JSON 可配置 battery/network/sms/notification 及通知包名过滤                        |
| 设备应用同步/安装迁移 | 已完成，移除 Node Server 原始脚本常量，安装地址来自版本表且仅允许 HTTPS                    |
| TikTok 手机端管理     | 已完成，已验证的 v2 发布脚本迁入 mobile/task-scripts，支持素材池、标题池、详情池和链接结果 |
| Presence 持久化       | 首版仅监听并发出内部事件，设备表的心跳/能力字段留到下一阶段                                |
| PC 旧任务入口迁移     | 已完成，原路由改为 Node Server API 客户端；旧脚本文件仅保留迁移对照，不再被读取            |
| Node/Worker 双运行时  | 已完成，Node 使用 MQTT 长连接，Worker 使用 HTTP 回调；两路结果按终态幂等                   |

## 3. 主要文件

### Node Server

- `server/packages/admin/src/mobile/async-task/`：可信任务调度、查询、结果落库和超时。
- `server/packages/admin/src/mobile/device-app/service.ts`：应用同步/安装领域编排。
- `server/packages/admin/src/mqtt/listener.ts`：v1 事件兼容与 v2 event/result/presence 监听。
- `server/apps/server/src/node.ts`：启动 MQTT 长连接监听。
- `server/apps/server/src/worker.ts`：scheduled 超时扫描，不加载长期 MQTT Listener。
- `server/packages/core/src/constants/permissions.ts`：增加异步任务 dispatch 权限种子。
- `server/packages/core/src/db/sql/admin/admin_mobile_async_task.sql`：新库 DDL。
- `server/packages/core/src/db/migrations/20260810_*.sql`：旧库增量字段迁移；每列独立文件，单列重复不阻断其他列补齐。

### 手机端

- `mobile/src/config.ts`：读取和合并 `autojs6-config.json`。
- `mobile/src/protocol.ts`：v2 请求/结果/事件/Presence 类型与入站校验。
- `mobile/src/task-registry.ts`：手机可信脚本注册表。
- `mobile/src/client.ts`：队列、执行、超时、结果、Presence 与事件上传。
- `mobile/task-scripts/`：手机本地可信脚本。
- `mobile/src/scripts/notification_observer.js`：通知监听。
- `mobile/autojs6-config.example.json` 与 `mobile/README.md`：部署示例和接口说明。

### PC 兼容层

- `pc/src/service/node-server.service.ts`：统一调用 Node Server 的 dispatch/get/list POST API。
- `pc/src/service/autojs.service.ts`：只接收可信 `scriptId + params`。
- `pc/src/controller/`：TikTok、应用、文件和通用任务入口全部迁移；旧回调与内存任务中心已移除。
- `pc/src/scripts/`：不再被运行时读取，仅保留迁移对照。

## 4. 安全变化

1. 手机只订阅自己的 v2 任务 Topic，公共旧 Topic 默认不订阅。
2. 未注册/未允许脚本、错误版本、错误设备、过期任务、非法 ID 和大于 64 KiB 的参数会被拒绝。
3. 任务 ID 与设备 ID 经过字符白名单校验，避免临时文件路径与 Topic 注入。
4. 参数以 JSON 字面量注入本地固定脚本，服务端无法提供脚本路径或正文。
5. 结果同时校验 MQTT Topic、deviceId、scriptId 与 traceId，晚到或重复结果不能覆盖终态。
6. Node Server 原 `device-app/scripts.ts` 已移除；新流程数据库 `script` 兼容列只保存 scriptId。
7. Worker HTTP 回调使用 taskId/deviceId/scriptId/traceId 匹配，回调路由采用精确白名单，结果上限 1 MiB。
8. APK/ZIP 仅允许 HTTPS，通用下载仅允许 HTTP(S) 且目标必须位于 `/sdcard/`；ZIP 解压包含路径穿越校验。

## 5. 验证记录

- 手机端 `npx tsc --noEmit`：通过。
- 手机端全部 `task-scripts/*.js`、`src/scripts/*.js` 执行 `node --check`：通过。
- 服务端 `tsc -p apps/server/tsconfig.json --noEmit`：通过，无未解决 TypeScript 错误。
- Worker 专用 `tsc -p apps/server/tsconfig.workers.json --noEmit`：本次变更模块无错误；仓库其他模块仍有 8 条既有严格类型错误。
- PC 端 `npx tsc --noEmit`：通过。
- 服务端变更 TypeScript 文件 ESLint：0 error；公共封装文件保留 1 条既有 `as any` warning。
- 服务端变更模块扫描 `any/as any`：未新增。
- TikTok 与应用列表脚本迁移一致性检查：通过；TikTok 仅替换受控参数占位符。

Windows 依赖环境执行 `wrangler deploy --dry-run` 已通过，成功生成 Worker Bundle（未部署），D1/KV/R2/AI 与环境变量绑定均被识别。Worker 严格配置仍有 8 条既有错误，位于 `maintenance/init`、`swarm/docker`、`system/user`、`core/initPermissions` 与 `personal/user_config`，本次变更路径未出现错误。

实机联调使用 Pixel 5、AutoJS6 6.7.0：

| 验证项 | 结果 |
| ------ | ---- |
| 手机 ADB 部署、守护进程与 Presence | 通过，客户端上线并订阅设备隔离 Topic |
| 电量监听 | 通过，模拟 77% 与复位 100% 均上传；测试后已恢复系统电量 |
| 网络监听 | 通过，Wi-Fi 断开/恢复、OFFLINE/ONLINE 均到达 Node Server |
| 通知监听 | 通过，临时授权后收到包名/标题/正文/时间；测试后已撤销授权并恢复默认关闭 |
| 应用列表 | 通过，all 305、third 21、system 284，分类结果一致 |
| 应用版本 | 通过，识别 AutoJS6 6.7.0（versionCode 3804） |
| 文件下载 | 通过，下载文件大小 64 字节；测试文件已删除 |
| 服务端超时 | 通过，1 秒慢下载任务进入 TIMEOUT，未遗留文件 |
| 安全边界 | 通过，原始 Shell/RCE、非 HTTPS APK/ZIP、非法包名和越界下载路径均被拒绝 |
| TikTok 图片 | 通过，严格核对本次文案后回传图片作品链接，短链解析为当前账号 `/photo/7672105041179823382` |
| TikTok 视频 | 通过，严格核对本次文案后回传视频作品链接，短链解析为当前账号 `/video/7672107773970205974` |
| Node/Worker 双运行时 | Node 实际启动联调通过；Worker `wrangler deploy --dry-run` 通过 |

人工审查共四轮：前三轮完成结果幂等、迁移恢复性、安全边界和 Node/Worker 入口交叉核对；第四轮依据实机联调修正了普通启动误执行 `git reset`、Observer 重复实例、日志中的 MQTT 凭据脱敏、TikTok 补链未主动启动应用及 Android 后台剪贴板读取限制。PC 与 Node 临时服务在验证后均已关闭，手机守护进程保留运行。

## 6. 上线步骤

1. 在与现有 `node_modules` 平台一致的终端执行数据库增量迁移：`cd server && pnpm db:init node migration`。
2. 执行权限/Schema 同步（如部署流程未自动执行）：`pnpm sync:permissions`、`pnpm sync:schemas`。
3. 为 PC 配置可访问的 `NODE_SERVER_BASE_URL`、有 read/dispatch 权限的令牌与默认 `AUTOJS6_CLIENT_ID`。
4. 手机端复制 `autojs6-config.example.json` 为 `autojs6-config.json`，为每台设备设置唯一 deviceId。
5. 将完整 `mobile/`（尤其 `task-scripts/`）部署到 Termux 后重启守护进程。
6. 先通过 `device.apps.list` 做无副作用联调，再分别验证 TikTok 图片、视频及 `linkOnly` 补链。

## 7. 后续建议

1. 将 Presence 的在线时间、客户端版本和脚本能力写入设备表，后台展示“是否在线/能力是否匹配”。
2. 增加设备级取消 Topic 和取消状态机；首版保留 CANCELLED 结果枚举但尚未开放取消 API。
3. 确认外部调用方均已改用可信任务请求体后，删除 PC `src/scripts/` 的迁移对照文件。
4. 动态升级手机脚本时使用签名脚本包、版本清单与灰度策略，不恢复远程源码执行。
5. 为任务结果领域处理增加 outbox/重试表，避免应用同步等服务端后处理在进程异常时丢失。
