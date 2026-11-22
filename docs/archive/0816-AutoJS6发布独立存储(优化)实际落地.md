# AutoJS6 发布独立存储优化实际落地

## 实际改动

- `base.sysConfig` 新增 `getConfigByKey(namespace, configKey)`，只做精确读取，不使用主配置兜底。
- OSS 配置服务新增 `getEnabledConfigByName(name)`，配置不存在或禁用时返回统一业务错误。
- OSS 文件门面新增 `getStorageConfigByKey` 与 `getStorageByConfigKey`，通用文件接口继续使用原默认 OSS。
- 客户端发布上传准备、上传完成校验、部署下载签名全部固定使用 `mobile-client-release`。
- 新增单元测试覆盖精确读取、缺失配置、禁用配置和固定发布配置名。

## 与计划对比

代码实现与计划一致：没有新增数据库表或公开 HTTP 接口，没有修改现有默认 OSS 行为，也没有触碰 `anyway-assets` 的桶策略。

生产操作按独立步骤执行：新建私有桶和非默认 Gate 配置后再部署代码，避免新代码上线时配置尚不存在。

## 验证结果

- Prettier：通过。
- ESLint：0 error；仅保留修改文件原有的 7 个 warning，本次未新增 `any`。
- 相关 Node Vitest：3 个测试文件、12 个用例全部通过。
- `tsgo -p apps/server/tsconfig.json --noEmit`：通过。
- `pnpm --filter @hodor/server build`：通过。
- Supabase 已创建私有桶 `mobile-client-releases`：50 MB（项目全局上限），仅允许 `application/gzip`。
- Gate 已创建启用、非默认的 `mobile-client-release` S3 配置并指向新桶；`anyway-assets` 未修改。
- 生产预检和真实 `v2.0.1` 发布：合并部署后执行并补充结果。

## 后续建议

- 后续可给 `base_sys_config(namespace, config_key)` 增加唯一索引，并在新增/更新接口提供明确的重名错误，进一步消除人工配置歧义。
- 若未来增加其他大制品，可按用途继续使用独立命名配置，避免切换系统默认 OSS 影响关键发布链路。
- 本次没有新增未处理的 TypeScript 报错。
