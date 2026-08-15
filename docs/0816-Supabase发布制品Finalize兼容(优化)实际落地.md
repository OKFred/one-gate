# Supabase 发布制品 Finalize 兼容优化实际落地

## 实际改动

- 新增 `getReleaseArtifactMetadataValidationError` 纯函数，集中校验上传制品 HEAD 元数据。
- 对象不存在、精确大小不一致、MIME 缺失或不是 `application/gzip` 时拒绝 finalize。
- 上游明确返回 `customMetadata.sha256` 且不一致时拒绝 finalize。
- 仅在 S3 兼容服务不回传自定义摘要 metadata 时允许继续登记。
- finalize 改为使用统一校验结果并返回不含存储配置的明确错误。
- 新增测试覆盖缺失 metadata 的 Supabase 兼容路径及全部拒绝分支。

## 与计划对比

实际代码与计划一致。首轮复盘额外收紧了 MIME：最初实现允许 HEAD 缺失 `Content-Type`，复盘后改为必须明确等于 `application/gzip`，避免兼容范围超过本次 Supabase 自定义 metadata 问题。

没有新增数据库、HTTP 路径、请求字段或响应字段；专用 OSS 配置、普通文件管理和不可变对象策略均未修改。

## 验证结果

- Prettier：通过。
- ESLint：通过，无新增 error。
- 相关 Node Vitest：1 个测试文件、9 个用例通过。
- `pnpm --filter @hodor/server build`：通过，包含 `tsgo` 与 `tsc-alias`。
- `git diff --check`、LF 与 UTF-8 BOM：通过。
- 生产部署、预检和 `v2.0.1` 重跑：PR 合并后执行。

## 生产恢复说明

当前专用桶中有一个上传成功但未登记的 `v2.0.1` 对象。它保持不可覆盖状态。本修复上线后，需要操作者确认删除该孤立对象，再重跑同一不可变 Tag；删除前不会再次触发发布。

## 后续建议

- 后续可为存储驱动增加统一的服务端内容摘要能力，在运行时和带宽可控的前提下由 Node Server 对归档重新哈希。
- 后续发布脚本可增加“已上传、未 finalize”的显式恢复协议，避免依赖删除孤立对象重跑。
- 本次没有新增未处理的 TypeScript 报错。
