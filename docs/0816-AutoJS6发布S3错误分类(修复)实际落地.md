# AutoJS6 发布 S3 错误分类（修复）实际落地

## 背景

生产发布预检已确认默认对象存储配置字段存在，但在检查不可变制品路径时只能返回笼统的连接失败。当前默认存储是 Supabase Storage 的 S3 兼容端点，需要进一步区分 Region、访问密钥、Bucket 与网络问题，同时禁止返回密钥、端点值或上游原始响应。

## 实际改动

- S3 预签名配置现在显式要求 `endpoint` 与 `region`，避免缺省 `auto` Region 参与 Supabase SigV4 签名。
- 将 `HeadObject` 异常映射为固定安全类别：签名或 Region、Access Key 或权限、Bucket、不通或 TLS/网络、其他配置。
- `NoSuchBucket` 不再被通用 HTTP 404 当成“目标对象尚不存在”，确保错误可以进入安全分类。
- 错误响应不包含访问密钥、Secret、Endpoint、对象路径、上游消息或异常堆栈。
- 新增缺失 Region、完整 S3 配置及各错误类别的单元测试。

## 与原计划的差异

原 V1 计划要求发布前校验摘要和存储可用性，本次不改变接口、数据库和发布状态机，仅细化已有预检的配置约束和安全诊断；没有引入新的生产数据或存储写入。

## 验证与后续

- 执行 Prettier、严格 TypeScript 检查、相关 Vitest、`git diff --check` 与 LF/BOM 检查。
- 部署后重跑只读预检，根据固定错误类别修正生产 OSS 配置，再重跑 `v2.0.1` 的失败发布任务。
- 本次不新增或遗留 TypeScript 报错。
