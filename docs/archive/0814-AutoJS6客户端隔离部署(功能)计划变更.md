# AutoJS6 客户端隔离部署计划变更

## 已确认变化

- 客户端升级从源码目录 `git pull/reset` 改为 Tag 生成的不可变归档。
- APK `app-version` 继续只管理 APK；新增客户端发布、环境修订和部署三个独立控制面。
- 普通 AutoJS 任务不再允许 `client.self-update`；部署使用独立 MQTT v1 管理协议。
- 环境模板只保存非敏感策略；业务密钥只保存在设备本地，管理通道不随环境变化。
- 默认优雅切换，强制切换二次确认，90 秒未就绪自动回滚。
- 管理界面先集成到设备状态抽屉；发布、环境和部署各使用独立业务键及 `read/dispatch` 权限，避免 OpenAPI 组件和旧异步任务权限发生碰撞，同时不新增侧栏菜单。

## 实现调整

- 制品上传采用 Worker 生成的 R2/S3 预签名 URL，由 CI 直传，规避 Worker 内存中转。
- 设备当前版本、环境、摘要、supervisor 和部署协议通过现有设备 Info 的 `capabilities` 与 `reportedExtra` 持久化，V1 不重复增加设备表列。
- 数据库生成脚本在当前 WSL 的 pnpm store 遇到 SQLite I/O 错误；已用仓库本地 `drizzle-kit` 生成结果核对四张表，再落增量迁移和全量 DDL。
- PC 旧 `/api/devices/update` 明确返回 410，新增代理接口保持异步查询和统一信封。

## 上线闸门

生产启用前必须配置 `MOBILE_RELEASE_PUBLISH_TOKEN`、可生成预签名地址的对象存储和 MQTT。先迁移 D1，再发布 Node Server，再由 ADB 安装 supervisor，最后推送第一个正式 Tag。任一环节失败都保持旧手机仓库入口可恢复。
