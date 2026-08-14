# AutoJS6 客户端隔离部署实际落地

## 已实现

- one-autojs6 新增 Tag 发布流水线、版本一致性校验、逐文件与归档摘要、敏感文件排除和预签名直传。
- 手机端新增稳定 supervisor、隔离目录、原子 current 指针、90 秒 ready、自动回滚和当前加两个历史版本保留。
- 手机客户端从构建清单读取版本，按环境选择配置/状态/日志目录，监听独立部署主题，并支持优雅排空与强制抢占清理。
- Node Server 新增发布、环境修订、部署模型和全 POST 接口；支持版本撤销、环境不可变修订、单设备部署互斥、状态转换、服务端超时和回滚审计。
- MQTT 监听器新增部署事件订阅；可信普通任务删除 `client.self-update`。
- 后台设备状态抽屉新增版本/环境选择、GRACEFUL/FORCE、环境编辑、版本撤销、阶段历史和回滚操作。
- PC 服务新增兼容代理，旧更新接口返回 410。

## 数据库与配置

- 新增 `20260814_01_mobile_client_deployment.sql` 及对应 D1 `0002` 迁移。
- 更新全量 SQL、D1 contract、`.env.example`、Wrangler secret 声明和 Worker 环境类型。
- 新增发布、环境、部署三个独立业务键及 `read/dispatch` 权限；部署时需执行既有权限同步流程。
- 三个环境首次访问时幂等创建修订 1，内容为 `{}` 和空密钥键列表。

## 已执行验证

- one-autojs6 mobile 与 PC TypeScript 检查通过；mobile 6 组测试和 PC 13 项测试通过。
- 本地生成 `v2.0.0` 归档并逐一核验 1396 个清单文件；整体 SHA-256、入口依赖、敏感文件排除和 Tag/包版本不一致拒绝测试通过。
- Node Server 严格 TypeScript 检查通过；部署领域、HTTP 契约、迁移与公开路由共 4 个测试文件、12 项测试通过。
- 管理端 TypeScript 检查及 Vite 生产构建通过。
- Pixel 5 已通过 ADB 放置独立 supervisor、安装脚本及旧入口只读备份，但未写入激活描述，也未切换 `current`。

## 仍需生产验收

本次代码落地和本地验包不等于 R2 正式发布或 Node Server 线上部署。Pixel 5 的 supervisor 当前仅处于未激活预置状态；development/staging/production 完整切换、自动回滚和重启自恢复必须在具备干净 Tag 生成的正式制品 URL、设备本地密钥与已部署控制面后执行。验收期间仅允许运行 `device.apps.list`，不执行 TikTok 发布。
