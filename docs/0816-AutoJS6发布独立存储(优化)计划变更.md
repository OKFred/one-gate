# AutoJS6 发布独立存储优化计划变更

## 预计代码变更

- `server/packages/admin/src/base/sys_config/service.ts`
  - 增加按命名空间和配置键精确读取的注册服务方法。
- `server/packages/admin/src/oss/config/service.ts`
  - 增加按配置名读取已启用 OSS 配置的内部方法。
- `server/packages/admin/src/oss/file/service.ts`
  - 增加按配置键创建存储驱动的方法，并复用存储初始化逻辑。
- `server/packages/admin/src/mobile/client-deployment/service.ts`
  - 发布上传、完成校验和部署下载全部绑定 `mobile-client-release`。
- 相关测试
  - 验证固定配置名、精确读取、禁用/缺失时不回退，以及原有接口契约不变。

## 预计生产操作

1. Supabase 新建私有桶 `mobile-client-releases`，上限 100 MB，仅允许 `application/gzip`。
2. Gate 新增非默认 OSS 配置 `mobile-client-release`，复用现有 Supabase S3 凭据但使用新桶。
3. 合并并部署 Node Server。
4. 运行 Mobile release preflight。
5. 重跑 `v2.0.1` 发布任务，验证上传、finalize 和发布记录。

## 验证范围

- 格式化、ESLint、TypeScript、Vitest、构建。
- `git diff --check`、LF 与 UTF-8 BOM 检查。
- 生产预检、真实制品上传、发布记录查询。
- 确认 `anyway-assets` 的桶限制与默认配置未被修改。
