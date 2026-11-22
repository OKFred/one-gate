# AutoJS6 客户端隔离部署详细设计

## 1. 目标与边界

V1 只管理 one-autojs6 手机客户端。Node Server 保存期望组合，手机稳定 supervisor 维护实际组合；每台设备仍只运行一个客户端实例，不建设通用容器平台，也不在 Android 引入 Docker。

组合由不可变发布版本、不可变环境修订和部署编号组成。发布内容只读；业务状态和日志按环境持久化；管理 MQTT、设备身份和上报令牌固定在设备级配置中，不允许环境模板覆盖。

## 2. 数据模型

- `admin_mobile_client_release`：唯一版本和归档摘要、对象存储键、构建清单、发布或撤销状态。
- `admin_mobile_client_environment`：固定 `development`、`staging`、`production` 三个环境及当前修订指针。
- `admin_mobile_client_environment_revision`：配置和本地密钥键名的不可变修订。
- `admin_mobile_client_deployment`：设备、目标组合、切换模式、部署阶段、前一健康组合、审计与错误。

`active_client_id` 使用允许 NULL 的唯一索引表达“同一设备只能存在一个未终结部署”；部署进入终态时清空该列。环境修订只插入不更新，发布版本只允许撤销，不能覆盖或删除。

## 3. 发布与存储

Git Tag、`mobile/package.json` 和 `release-manifest.json` 必须一致。CI 先执行类型检查和测试，再生成只含编译代码、生产依赖、可信脚本和逐文件 SHA-256 的确定性归档。

Worker 不接收归档正文。CI 用专用 `MOBILE_RELEASE_PUBLISH_TOKEN` 请求短期 HMAC 上传票据和 R2/S3 预签名 PUT，直传至 `mobile-client/releases/{version}/{sha256}.tar.gz`。完成接口用对象元数据核对大小后登记发布；手机端仍必须校验归档 SHA-256 和清单内所有文件摘要。

## 4. 部署协议与状态

部署命令使用 `autojs6/deploy/v1/devices/{deviceId}/commands`，设备事件使用 `autojs6/deploy/v1/devices/{deviceId}/events`，均为 QoS 1。Node Server 接口立即返回部署记录，不等待手机执行。

阶段为 `PENDING → STAGING → DRAINING/PREEMPTING → ACTIVATING → VERIFYING → SUCCEEDED`。`FAILED`、`ROLLED_BACK`、`TIMED_OUT`、`CANCELLED` 为终态。事件必须同时匹配部署 ID、设备、版本、环境和修订，且只能按领域状态图前进。

`GRACEFUL` 默认等待 15 分钟并拒绝新任务，超时保持旧组合；`FORCE` 必须二次确认，并在制品就绪后抢占当前任务。服务端定时终结超过期限的记录，手机启动验证失败则由 supervisor 原子切回前一健康组合。

## 5. 手机隔离与安全

supervisor 独立位于 `bootstrap/`，普通版本更新不能覆盖。`releases/` 存放不可变版本，`environments/` 存放非敏感修订，`secrets/{environment}.env` 为 0600 本地密钥，`state/{environment}` 和 `logs/{environment}` 按环境隔离，`state/shared` 仅保存输入法恢复等设备级安全状态。

下载前后都校验摘要；解包前拒绝绝对路径、`..`、越界软链和特殊文件；环境密钥文件只接受清单声明的键，值不上传、不回显、不写日志。激活用同目录临时软链原子替换 `current`，90 秒内未写 ready 标记就回滚。清理只删除非当前且非上一健康的旧版本，保留当前加两个历史版本，不清理业务状态。

## 6. 管理界面与权限

设备状态抽屉新增“客户端部署”页签。发布、环境、部署分别使用 `admin.mobile.client_release`、`admin.mobile.client_environment`、`admin.mobile.client_deployment` 业务键，各提供 `read/dispatch` 权限；这样不会与既有异步任务的 OpenAPI 组件或角色授权碰撞。页面轮询异步阶段；FORCE、撤销和回滚均有显式确认。

## 7. 迁移与验收

首次安装 supervisor 时备份旧入口并保留原手机仓库。金丝雀依次验证 development、staging、production、同版本换环境、跨版本升级、缺少密钥、优雅排空超时、启动超时和自动回滚。真机业务验证只运行 `device.apps.list`，不触发 TikTok 发布。稳定观察期结束前不删除旧运行目录。
