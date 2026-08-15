# AutoJS6 发布存储诊断（修复）实际落地

## 背景

AutoJS6 `v2.0.1` 已在 GitHub Actions 中通过 pnpm 11.20.0 安装、类型检查、测试和不可变制品构建，但调用 `/api/v1/admin/mobile/client-release/upload/prepare` 时只得到 `errorHandler.unknownError`。原实现没有区分默认 OSS 配置缺失、对象存储连接失败和预签名失败，无法在不读取密钥值的前提下定位生产配置。

## 实际改动

- OSS 文件门面新增 `getActiveStorageConfig`，复用现有默认配置读取逻辑，不让部署领域直接依赖 OSS 配置服务。
- 发布准备接口在访问存储前检查 `provider`、`bucket`、`accessKey`、`secretKey`；R2 额外检查 `accountId`。
- 存储对象检查和预签名分别转换为安全、可操作的业务错误，不返回配置值、签名 URL 或底层异常正文。
- 增加 S3、R2 缺失字段和完整配置的单元测试。

## 与原计划的差异

本次没有新增公共接口，也没有改变上传、制品不可覆盖或发布状态模型。它只补强 `0814-AutoJS6客户端隔离部署` 设计中“CI 取得预签名上传地址”的生产诊断能力，因此不修改原详细设计和计划变更文档。

## 验证结果

- Prettier：通过。
- Server 严格 TypeScript：通过，无新增类型错误。
- 客户端部署领域测试：2 个文件、8 个测试通过。
- `git diff --check`、UTF-8 无 BOM、LF：交付前检查通过。
- 代码按规范完成 2 轮复盘；第一轮发现并消除了部署服务对 OSS 配置服务的新增直接依赖，第二轮未发现新的阻断问题。

## 后续建议

部署本修复后重新运行 one-autojs6 的 `Mobile release preflight`。若报告缺少字段，应在生产 Gate 的 OSS 配置中补齐 R2/S3 预签名凭据；若报告连接或预签名失败，再针对对应阶段检查端点、Bucket 和密钥权限。预检通过后可安全重跑 `v2.0.1` 发布任务，同一标签和制品路径仍保持不可变。
