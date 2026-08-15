# Supabase 发布制品 Finalize 兼容优化详细设计

## 背景

移动客户端发布已切换到专用 Supabase S3 桶 `mobile-client-releases`。`v2.0.1` 制品 PUT 上传成功，文件大小与 MIME 正确，但 Supabase S3 的 HEAD 结果未提供预签名上传时声明的自定义 `sha256` metadata，导致 `/client-release/upload/finalize` 将兼容性差异误判为制品摘要不一致。

## 目标

- 保持制品不存在、大小不一致、MIME 不一致和显式摘要不一致时拒绝 finalize。
- S3 兼容服务未返回自定义 metadata 时，允许使用已签名上传票据、内容寻址对象键和精确大小完成登记。
- 不修改发布版本不可覆盖、对象路径不可覆盖和客户端下载后 SHA-256 校验规则。
- 不删除当前孤立制品；兼容修复部署后再由操作者确认是否删除并重跑不可变 Tag。

## 校验规则

新增纯函数统一校验 HEAD 元数据：

1. 对象不存在：拒绝。
2. `Content-Length` 与上传票据不一致：拒绝。
3. HEAD 返回 `Content-Type` 且不是 `application/gzip`：拒绝。
4. HEAD 返回 `customMetadata.sha256` 且与票据不一致：拒绝。
5. HEAD 未返回 `customMetadata.sha256`：允许 finalize。

第 5 条只兼容“上游不回传 metadata”的情况；若上游明确回传了错误摘要仍然拒绝。上传票据由发布令牌签名且有效期为一小时，对象键包含期望 SHA-256，手机 supervisor 下载后仍会计算真实文件摘要，错误内容无法激活。

## 风险与边界

- Node Server 不在 finalize 阶段下载整个归档重新哈希，避免为 S3 兼容差异引入额外带宽和运行时流适配。
- 当前已上传但未登记的 `v2.0.1` 对象会继续阻止 prepare 覆盖，符合不可变约束。
- 删除孤立对象属于生产破坏性操作，必须在修复上线后单独确认；删除后由同一 Tag 重新构建、上传和 finalize。
