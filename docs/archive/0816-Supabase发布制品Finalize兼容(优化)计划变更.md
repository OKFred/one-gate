# Supabase 发布制品 Finalize 兼容优化计划变更

## 预计代码变更

- `server/packages/admin/src/mobile/client-deployment/service.ts`
  - 增加发布制品 HEAD 元数据纯校验函数。
  - finalize 使用统一校验结果，兼容缺失自定义摘要 metadata。
- `server/packages/admin/src/mobile/client-deployment/service.spec.ts`
  - 覆盖对象缺失、大小不一致、MIME 不一致、显式摘要不一致和摘要缺失兼容。

## 预计验证

- Prettier 与 ESLint。
- 相关 Vitest、`tsgo` 和服务构建。
- `git diff --check`、LF 和 UTF-8 BOM 检查。
- PR CI、生产部署、Mobile release preflight。
- 经确认删除孤立对象后，重跑 `v2.0.1` Tag 发布并查询发布记录。

## 不变项

- 不修改专用 OSS 配置和桶策略。
- 不移动或覆盖 Git Tag。
- 不允许覆盖已存在的发布记录或制品路径。
- 不改变普通 OSS 文件管理接口。
