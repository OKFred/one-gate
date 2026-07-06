# 文件管理系统前后端改造计划

## Summary

按 `full_stack_dev_guide.md` 做前后端一起升级：新增面向文件管理器的 OSS 目录列表接口，前端新增全站可复用 `FileManager` 组件，并替换当前 OSS 文件页。目标是行业常见的对象存储文件管理体验：目录浏览准确、移动端好用、上传下载顺滑，同时避免把“文件夹”完全交给前端猜。

## Backend Changes

- 扩展存储抽象 `StorageProvider.list`：
  - `StorageListOptions` 新增 `delimiter?: string`。
  - `StorageListResult` 新增 `prefixes?: string[]`，用于返回当前层级的子目录。
  - S3 使用 `ListObjectsV2Command` 的 `Delimiter: "/"` 和 `CommonPrefixes`。
  - R2 使用 `bucket.list({ prefix, delimiter: "/" })` 并读取返回的目录前缀。
- 新增接口 `POST /api/v1/oss/file/listDirectory`：
  - 请求：`prefix?: string`, `pageSize?: number`, `cursor?: string`。
  - 响应：`prefix`, `directories`, `files`, `pageSize`, `cursor`, `hasMore`。
  - 权限：`oss.file:read`，不新增权限码。
  - `directories` 返回 `{ key, name, prefix }`，`files` 返回现有文件字段。
- 保留现有 `/list`, `/listAll`, `/get`, `/add`, `/update`, `/delete` 兼容旧调用。
- 增加 key 规范化辅助逻辑：
  - 去掉开头 `/`，压缩重复 `/`，拒绝空 key、`..` 路径片段。
  - 上传、下载、删除、目录列表统一使用该校验。
- 更新 `server/src/api/oss/file/model.ts` 的 JSON Schema，并按项目机制同步生成前端 OpenAPI 类型和 schema。

## Frontend Changes

- 新增 `platform/src/components/FileManager` 通用组件：
  - 使用 MUI、`useResponsive`、`ResponsiveButton`，不使用 `any`。
  - 通过 adapter 接入后端，组件不直接依赖 OSS API。
  - 桌面端表格视图，移动端卡片视图。
  - 路径面包屑导航、刷新、上传、下载、复制临时链接、删除确认。
- 新增/更新 OSS 文件 API 客户端：
  - `listDirectoryFn`
  - `getFn`
  - `addFn`
  - `updateFn`
  - `deleteFn`
  - `directUploadFn`
- 改造 `platform/src/pages/oss/file/index.tsx`：
  - 使用 `FileManager` + OSS adapter。
  - 上传默认放入当前目录，仍允许手动调整路径。
  - 下载/复制链接先调用 `getFn({ key })` 获取临时 `downloadUrl`。
  - 删除成功、上传成功后刷新当前目录。
- 清理现有 OSS 文件页组件中乱码注释和兜底文案。
- 翻译 key 使用点分隔命名，补充到 OSS 翻译初始化中，例如：
  - `oss.file.folder`
  - `oss.file.currentPath`
  - `oss.file.copyUrl`
  - `oss.file.uploadProgress`
  - `oss.file.emptyDirectory`

## Behavior Details

- 文件夹不是数据库实体，而是对象存储标准前缀目录：
  - 根目录 `prefix = ""`。
  - 子目录 `prefix = "docs/"`。
  - 空目录不支持创建，因为对象存储没有真实空目录概念。
- 搜索本轮不做全桶模糊搜索：
  - 对象存储没有高效通用模糊搜索能力。
  - 文件管理器保留当前目录浏览；如需全局搜索，后续应引入索引表或专门搜索接口。
- 不做本轮能力：
  - 重命名、移动、批量删除、目录删除、文件预览。
  - 这些能力需要 copy/delete-many 或索引能力，后续可作为第二阶段扩展。

## Test Plan

- 后端：
  - 为 `StorageProvider.list` 的 delimiter 行为补单元测试或服务测试。
  - 验证 `listDirectory` 在根目录、子目录、空目录、分页游标下返回正确。
  - 验证非法 key 被拒绝。
  - 运行 `server` 构建。
- 前端：
  - 运行 `platform` 构建。
  - 验证 OSS 文件页：进入目录、返回面包屑、上传、下载、复制链接、删除、刷新。
  - 移动端 375px 验证卡片、长文件名、按钮、分页、上传弹窗不溢出。
- 同步：
  - 后端 schema 更新后，通过项目现有 OpenAPI/schema 同步流程更新 `platform/src/types/openapi.d.ts` 和 `platform/src/assets/schemas/*.json`。

## Assumptions

- 本轮按最佳实践新增 `listDirectory`，但不引入数据库文件索引表。
- 权限沿用现有 `oss.file:read/add/edit/delete`，不新增权限动作。
- 全站通用组件先服务 OSS 文件管理，未来其他存储或业务文件模块通过 adapter 复用。
