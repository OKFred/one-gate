# 全栈 JSON 契约CRUD与Monorepo架构(优化)计划变更

> 编写日期：2026-11-20
> 关联详细设计：[1120-全栈JSON契约CRUD与Monorepo架构(优化)详细设计.md](./1120-全栈JSON契约CRUD与Monorepo架构(优化)详细设计.md)

## 1. 分批实施与提交规划

本方案按以下 **8 个原子批次**逐步实施、验证并本地提交（每个批次均需通过对应门禁检查与 `git diff --check`，严禁跳过 `pre-commit` 检查、严禁暂存私有配置与构建产物）：

| 批次 | 提交标识 | 核心交付内容 | 主要变更范围 |
|---|---|---|---|
| **Batch 0** | Commit 1 | 前置详细设计与计划变更文档 | `docs/1120-全栈JSON契约CRUD与Monorepo架构(优化){详细设计,计划变更}.md` |
| **Batch 1a** | Commit 2 | 根级统一 pnpm Monorepo、前端 App 重命名、Docker/CI/Hooks 适配 | `pnpm-workspace.yaml`、`pnpm-lock.yaml`（删旧双锁文件）、`platform/apps/*/package.json`、`platform/package.json`、`platform/playwright.config.ts`、`.dockerignore`、`deploy.js`、`server/Dockerfile`、`platform/Dockerfile`、`.github/workflows/test.yml`、`hooks/pre-commit` |
| **Batch 1b** | Commit 3 | 顶层 `@hodor/contracts` 共享包、后端 `createCrudApis` 装配器、前端 `ContractCrudPage` 引擎、自动路由与离线同步工具链 | `packages/contracts/**`、根 `package.json`、`server/packages/core/src/middleware/encapsulation/{common.schema,crud}.ts`、`server/apps/server/scripts/export-openapi.ts`、`platform/packages/ui/src/{api/crud.ts,components/Crud/**,components/Form/useFieldLogic.ts,hooks/useFormError.ts,routes/buildContractRoutes.tsx}`、`platform/apps/*/src/routes.tsx`、`platform/scripts/scan-i18n-enhanced.js` |
| **Batch 2** | Commit 4 | 10 个标准与配置型 `PURE_JSON` 页面全栈迁移（0 TSX） | `packages/contracts/src/resources/admin/{i18n/language,rpa/config,ai/config,oss/config,swarm/docker_config,mail/account,base/webhook_config,base/sys_config,mqtt/config,voice/config}.json`、对应后端 `model.ts`/`service.ts`、删除对应旧前端页面目录 |
| **Batch 3** | Commit 5 | 9 个只读日志与嵌入式 `PURE_JSON` 页面迁移 | `packages/contracts/src/resources/admin/{maintenance/loginLog,mail/log,mobile/async-task,mobile/device-app,mobile/app-version,base/log-*}.json`、后端 `mobile/app-version`、精简 `base/log/index.tsx` 与 `mobile/app` 抽屉、删除对应旧组件 |
| **Batch 4** | Commit 6 | 6 个软删除（`system/role` 纯 JSON）及系统权限/国际化页面迁移 | `packages/contracts/src/resources/admin/{system/role,system/api-token,system/permission,system/user,i18n/region,i18n/translation}.json`、对应后端服务、删除 `system/role/` 及其余 5 页旧 `TheFilter`/`TheTable`/`TheForm` 并瘦身 `index.tsx` |
| **Batch 5** | Commit 7 | 11 个运维、移动端、邮件模板与 Swarm 复杂扩展页迁移（含修 `mobile/device` 与 `mobile/app` 存量 bug） | `packages/contracts/src/resources/admin/{data/schema_form,data/schema_form_data,mail/template,maintenance/api-docs,maintenance/api-task,maintenance/cache,maintenance/cron,mobile/app,mobile/device,swarm/docker,swarm/nodes}.json`、对应薄壳 `index.tsx` 与后端修补 |
| **Batch 6** | Commit 8 | 企业端考勤迁移（含修后端 VO/`any`）、死代码与孤立 `constant.ts`/样板 API 清理、规范/文档更新、多轮复盘与实际落地文档 | `packages/contracts/src/resources/enterprise/organization/attendance.json`、`platform/apps/enterprise/src/pages/organization/attendance/`、后端 `attendance/service.ts`、删 `oss/file` 死代码、`platform/scripts/generate-constants.js`、`.agents/{global,frontend,backend}.md`、`docs/crud_developer_guide.md`、`docs/1120-...实际落地.md` |
| **Batch 7** | 发布操作 | 验证通过并核实私有目标后部署 Cloudflare Workers 与 3 个 Cloudflare Pages | 无受追踪仓库代码修改，仅执行构建与远端部署并记录部署地址/版本 |

---

## 2. 预计影响范围与兼容性声明

1. **Workspace 包名变更映射**：
   - `platform/apps/admin`: `@hodor/admin` → `@hodor/web-admin`
   - `platform/apps/enterprise`: `@hodor/enterprise` → `@hodor/web-enterprise`
   - `platform/apps/personal`: `@hodor/personal` → `@hodor/web-personal`
   - 后端 `@hodor/{core,admin,enterprise,personal,server}` 包名保持完全不变。
2. **向后兼容保证**：
   - `SchemaCrudPage` 保留完整现有签名与所有 `SchemaCrudConfig` 字段，非契约页或测试夹具（如 `e2e/fixtures/crud-switch`）无需改动即可继续运行；
   - 所有既有 Playwright E2E 选择器（`Add`、`Edit`、`Delete`、`Save`、`Cancel`、`Reload list`、`Device Status`、`撤销删除`/`Undo deletion` 等 ARIA 标签与文案）保持 100% 不变；
   - 后端所有 `encapsulation(service, "..." satisfies BusinessKey)` 与 HTTP 请求/响应格式完全向后兼容既有客户端、Node 单测、Workers 集成测试及 PostgreSQL 测试。
3. **CI 约束保护**：
   - 修改 `.github/workflows/test.yml` 时严格遵守 `server/apps/server/src/d1-deployment-contract.node.spec.ts` 中对 CI 工作流文件的全部断言。

---

## 3. 总体回归验证矩阵

- **Workspace & 契约检查**：
  - `pnpm install --frozen-lockfile`
  - `pnpm run sync:all`
  - `pnpm run contracts:check`
  - `pnpm --filter @hodor/contracts test`
- **后端检查与构建**：
  - `pnpm --filter @hodor/server exec tsc --noEmit -p tsconfig.json`
  - `pnpm --filter rbac-monorepo-root build`
  - `pnpm --filter @hodor/server exec vitest run --config vitest.config.node.mts --maxWorkers=2`
  - `pnpm --filter @hodor/server exec vitest run --config vitest.config.workers.mts recycle-bin soft-delete department-cleanup undo.integration tenant-isolation enterprise-http asset access-metadata disabled-role-auth cloudflare-usage ai/chat calendar mobile-task-runtime mobile/async-task/runtime task-control-publish device-report-route-whitelist --maxWorkers=1`
  - `pnpm --filter @hodor/server exec wrangler deploy --dry-run --outdir .wrangler/ci-bundle`
  - `pnpm --filter @hodor/server exec wrangler deploy --config wrangler.postgresql.jsonc --dry-run --outdir .wrangler/ci-pg-bundle`
- **前端检查、构建与 E2E**：
  - `pnpm --dir platform run check:native-dialogs`
  - `pnpm --dir platform run typecheck:e2e`
  - `pnpm --dir platform run build:all`
  - `node platform/scripts/scan-i18n-enhanced.js --fail-on-missing`
  - `node platform/scripts/check-locale-parity.js --fail-on-missing`
  - `pnpm --dir platform exec playwright test auth/auth-ui.spec.ts recycle-bin/recycle-bin.spec.ts delete-undo/ enterprise-assets/ api-token/ cloudflare-home/ calendar/ mobile-task-runtime/ --project=chromium`
  - `pnpm --dir platform run test:e2e:personal-assets`
- **代码规范与格式**：
  - `pnpm --dir server run lint`、`pnpm --dir platform run lint:check`、`git diff --check`
