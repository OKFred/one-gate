# Schema 依赖缺失防卡死（优化）计划变更

## 1. 预计修改

- `server/packages/core/src/utils/schemaRegistry.ts`
  - 新增按前缀读取运行时 Schema 的能力。
- `server/packages/admin/src/data/schema_form/service.ts`
  - `batch_get` 合并运行时 Registry 与 D1 Schema，D1 同名配置优先。
  - 清理触及范围内的非严格类型。
- `platform/packages/ui/src/hooks/useSchema.ts`
  - 支持多前缀加载并修正请求去重键。
  - 保持加载结束后的缺失状态可判定。
- `platform/packages/ui/src/components/Crud/SchemaCrudPage.tsx`
  - 为自定义表单提供 Schema 缺失降级。
- `platform/packages/ui/src/components/Crud/components/FormDialog.tsx`
  - 分离加载中、缺失、降级和正常状态。
- `platform/packages/ui/src/locales/zh-CN/components.ts`
- `platform/packages/ui/src/locales/en-US/components.ts`
  - 新增 Schema 缺失及降级提示。
- `.github/workflows/test.yml`
  - Worker 发布后自动同步远程 D1 系统 Schema。
- 相关测试文件
  - 覆盖 Registry 前缀查询与 Schema 来源合并规则。

## 2. 不修改

- 不修改 `system_schema_form` 表结构或生成数据库迁移。
- 不修改设备管理 API、权限、菜单及 OpenAPI 类型文件。
- 不修改 `one-autojs6`。
- 不自动创建任何设备业务数据。

## 3. 生产热修复记录

代码修改前，通过当前管理端登录态只补入以下两个由后端 OpenAPI 生成的系统 Schema：

- `admin.mobile.device.add.req`
- `admin.mobile.device.update.req`

热修复未新增或修改移动设备记录；正式发布后的 Worker Registry 兜底和 CI 同步将取代人工补数据流程。

## 4. 预期影响

- 设备新增弹窗立即恢复可用。
- 其他自定义表单在 Schema 缺失时不再无限等待。
- 完全动态表单在缺失 Schema 时显示明确错误并禁止提交。
- 后续部署若远程 Schema 同步失败，GitHub Actions 会在 Pages 发布前失败。
