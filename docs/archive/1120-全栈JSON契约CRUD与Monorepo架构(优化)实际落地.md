# 全栈 JSON 契约 CRUD 与 Monorepo 架构（优化）实际落地报告

> 对应设计方案：`docs/1120-全栈JSON契约CRUD与Monorepo架构(优化)详细设计.md`
> 对应计划变更：`docs/1120-全栈JSON契约CRUD与Monorepo架构(优化)计划变更.md`
> 开发指南：`docs/crud_developer_guide.md` 与 `.agents/{global,backend,frontend}.md`

---

## 1. 总体落地概况与分批提交对照

本次改造完成了**根级统一 pnpm Monorepo**、**顶层共享契约包 `@hodor/contracts`**、**后端自动 CRUD Schema 装配器 `createCrudApis`**、**前端声明式引擎 `ContractCrudPage` 与 `buildContractRoutes`**，并将仓库内 **37 个 `SchemaCrudPage` CRUD 页面 100% 迁移至共享契约驱动**（`platform/apps/` 下已无直接调用 `SchemaCrudPage` 的业务页面；`SchemaCrudPage` 保留作为 `ContractCrudPage` 与测试夹具 `platform/e2e/fixtures/crud-switch/main.tsx` 的底层调度引擎）。

原计划共 8 个批次，实际落地中在 Batch 5 与 Batch 6 之间新增 1 批 **Monorepo CI 回归修复提交**（Commit 8）；**Batch 7 已使用本地临时未跟踪配置完成后端 Worker 与全部 3 个 Pages 生产站点发布**（部署后即时清除临时配置，不在仓库保留任何真实 ID 或私密配置）：

| 实际提交顺序 | Commit 哈希 | 对应计划批次 | 提交说明与核心内容 |
| :--- | :--- | :--- | :--- |
| Commit 1 | `9e30bb95` | Batch 0 | `docs(crud): 添加全栈JSON契约CRUD与Monorepo架构详细设计与计划变更文档` |
| Commit 2 | `9fb8f024` | Batch 1a | `build(monorepo): 升级为根级统一pnpm工作区并重命名前端应用包` |
| Commit 3 | `611b73ea` | Batch 1b | `feat(contracts): 构建顶层共享契约包、后端CRUD装配器与前端声明式JSON引擎` |
| Commit 4 | `6e4ddb1a` | Batch 2 | `refactor(admin): 迁移首批10个纯JSON配置CRUD页至共享契约` |
| Commit 5 | `4e2d3211` | Batch 3 | `refactor(admin): 迁移9个只读与嵌入式CRUD页至共享契约` |
| Commit 6 | `3e509be8` | Batch 4 | `refactor(admin): 迁移6个软删除与系统国际化CRUD页至共享契约` |
| Commit 7 | `b5407790` | Batch 5 | `refactor(admin): 迁移11个复杂扩展CRUD页至共享契约`（63 个文件，4475+/5219-） |
| Commit 8 | `c243beee` | 计划外补充修复 | `fix(monorepo): 锁定Module Federation兼容版本并修复Workers测试Vite 8下pg-protocol解析`（6 个文件，335+/144-） |
| Commit 9 | 本批提交 | Batch 6 | `enterprise/organization/attendance` 迁移（第 37 个页）、死代码与冗余 `constant.ts` 清理、`generate-constants.js` 升级、`.agents/` 与 `docs/crud_developer_guide.md` 更新及本落地报告 |
| 线上发布 | — | Batch 7 | 已通过本地临时未跟踪配置完成后端 Worker 与 `gate` / `gate-enterprise` / `gate-personal` 3 个 Pages 生产发布（不入库任何真实 ID/私密配置） |

---

## 2. 与原计划差异及关键技术调整

1. **新增 Commit 8（Monorepo 依赖提升回归修复）**：
   - **Workers 测试 Vite 8 `pg-protocol` 解析修复**：统一根级 `pnpm-lock.yaml` 后，`vitest` 解析到前端升级的 `vite@8.3.8`；Vite 8 SSR `resolveId` 忽略 `@cloudflare/vitest-pool-workers` 传入的 `custom["node-resolve"].isRequire: true`，致使 `pg/lib/connection.js` 内的 `require('pg-protocol')` 误解析到 ESM 入口 `pg-protocol/esm/index.js` 并在 workerd 中抛出 `SyntaxError: Cannot use import statement outside a module`，导致 9 个导入 `worker.ts` 的 `src/*-migration.workers.spec.ts` 失败。在 `server/apps/server/vitest.config.workers.mts` 中添加前置插件 `workersCjsRequirePgProtocolPlugin` 将该场景精确解析至 `pg-protocol/dist/index.js` 后，全部 Workers 迁移测试恢复通过。
   - **Module Federation 版本锁定修复企业端间歇白屏**：统一锁文件时 `@module-federation/vite` 从 `1.16.12` 升级至 `1.24.1`（`@module-federation/enhanced` 从 `2.6.0` 升至 `2.9.3`），新版 `shared-cache-listeners` 机制在 `@hodor/web-enterprise` 独立加载时存在竞态，导致 `@mui/material` 模块顶层调用 `jsx` 时偶发 `TypeError: V is not a function` 白屏（`e2e/enterprise-assets/assets.spec.ts` 10/18 失败）。将 `admin`、`enterprise`、`personal` 与 `@hodor/ui` 的 `@module-federation/{vite,enhanced}` 精确锁定为 `1.16.12` 与 `2.6.0` 并刷新根级 `pnpm-lock.yaml` 后，白屏现象彻底消除。
2. **Batch 5 权限常量引用调整**：
   - 移除 `mobile/device` 页面目录冗余 `constant.ts` 后，保留复用的子组件 `DeviceOpsPanel.tsx` 与 `DeviceStatusDrawer.tsx` 改由 `@/hooks/usePermission` 直接导入权限对象，不再依赖页级 `constant.ts`。
3. **Batch 6 死代码保守清理边界与脚手架增强**：
   - 对 `platform/packages/ui/src/api/` 做全仓 AST/import 扫描后，发现 6 个零引用文件；其中 `openai.ts` 与 `asset-telemetry.ts` 属非 CRUD 独立功能封装予以**保守保留**，仅清理 4 个确认废弃的旧 CRUD API/类型文件（`admin/base/{sys_config.ts,webhook_config.ts,webhook_config.type.ts}`、`admin/maintenance/loginLog.ts`），连同 `oss/file/components/The{Filter,Table,UploadDialog}.tsx`、`attendance` 5 个旧组件/常量文件，以及 Batch 4 遗留的 4 个 `constant.ts`（`i18n/region`、`i18n/translation`、`system/permission`、`system/user`），共移除 16 个冗余文件。
   - 更新 `platform/scripts/generate-constants.js`，新增 `dirReferencesConstant(dirPath)` 检测目录及其 `components/` 下是否存在 `./constant` 或 `../constant` 导入，避免日后执行脚本在已契约化目录下重新生成孤儿 `constant.ts`。
4. **第 37 个页面 `enterprise/organization/attendance` 契约化要点**：
   - 新增 `packages/contracts/src/resources/enterprise/organization/attendance.json`，开启 `listAll: true`、通过 `in` 与 `requiredOn` 精确拆分写入字段 `employeeId` 与展示字段 `employeeObj`、为 `listAll` 显式保留审计字段并启用声明式 `detailDialog`。
   - 后端 `server/packages/enterprise/src/organization/attendance/service.ts` 迁移至 `createCrudApis` + `buildPagedListResult`，消除原有 3 处 `any` 与 `AttendanceVO` 误展开，保持 6 个端点全部挂载 `adapter: bodyUserAdapter` 及 `preventTimeTravel` / `preventEmpty` 校验。
   - 前端 `platform/apps/enterprise/src/pages/organization/attendance/index.tsx` 收敛为 `ContractCrudPage` 薄壳，保留 CSV 导出（带 `URL.revokeObjectURL`）及 `checkInTime`/`checkOutTime` 时间输入框复用渲染器。
5. **非标准页面按既定范围保留原架构**：
   - 非 CRUD 树形页（`system/department`、`system/menu`）、多表/复杂工作台（`oss/file`、`recycle-bin`、`role_permission`、`enterprise/tenant`、`enterprise/asset`、`personal/*` 等）按 Batch 0 范围界定保持定制实现不变。

---

## 3. 代码复盘与修复记录（`.agents/workflow.md` 规范，共 2 轮）

- **第 1 轮 Review 发现并修复（已重跑受影响校验）**：
  1. `server/packages/enterprise/src/organization/attendance/service.ts` 的 `onListAll` 中存在无意义的 `keyword: (params as { keyword?: string }).keyword`（`S.listAllReq` 闭合 Schema 本身不含 `keyword` 且设置了 `additionalProperties: false`），已移除该传参与 `as` 类型断言。
  2. `platform/apps/enterprise/src/pages/organization/attendance/index.tsx` 的 `customFormFields` 中 `checkInTime` 与 `checkOutTime` 两段 `<TextField>` JSX 存在重复，已抽取共享渲染函数 `renderTimeField` 消除重复，并将 `beforeSubmitAsync` 中 `employeeId` 判空收紧为 `String(form.employeeId).trim() !== ''`。
  3. 核查 `docs/crud_developer_guide.md` 后端示例代码，将 `userObj.id` 统一为与服务端习惯一致的 `userObj.userId`（对照 `server/packages/core/src/types/app.ts` 确认类型一致性）。
- **第 2 轮 Review 校验（零缺陷通过）**：
  - 确认 `git grep -n "SchemaCrudPage" platform/apps/` 无匹配结果；
  - 扫描 Batch 6 全部代码 diff 新增行，确认零 `any`、零 `as any`、零 `console.error`；
  - 校验 `.agents/{global,backend,frontend}.md`、`docs/crud_developer_guide.md` 及全部代码改动文件均为 UTF-8 无 BOM、LF 换行。

---

## 4. 全量验证与检查结果（精确范围说明）

| 检查项 | 执行命令 / 范围 | 实测结果 | 备注与覆盖范围说明 |
| :--- | :--- | :--- | :--- |
| 全栈契约同步与四维校验 | `pnpm run sync:all`（Batch 6 Review 微调后重跑） | 退出 0；生成 **37/37** 契约模块、识别 **49** 个 API 路由入口、schema / permissions / OpenAPI / `zh-CN` & `en-US` 双语校验全部通过 | 覆盖 `usePermission.ts`、`business.ts` 与 `openapi.d.ts` |
| 契约包类型与单测 | `pnpm --filter @hodor/contracts typecheck` & `test`（Batch 6 Review 微调后重跑） | `1 passed (1)`、`3 passed (3)` | `@hodor/contracts` 全量 |
| 后端类型与编译 | `tsgo --noEmit`、`rbac-monorepo-root build`、`wrangler deploy --dry-run`（Batch 6 Review 微调后重跑） | 全部退出 0（`Total Upload: 6359.53 KiB / gzip: 1170.81 KiB`） | 全后端 TS 编译与 Worker Bundle |
| 后端考勤集成测试 | `vitest run --config vitest.config.node.mts attendance.integration.spec.ts --maxWorkers=2`（微调后重跑） | **1 passed (1) \| 4 passed (4)** | `attendance` 增删改查链路 |
| 后端全量 Node Vitest | `vitest run --config vitest.config.node.mts --maxWorkers=2`（Batch 6 微调 `onListAll` 前全量执行） | **154 passed \| 11 skipped (165 files)**；**1433 passed \| 186 skipped (1619 tests)** | `11` 个 skipped 文件为未设置 `ONE_GATE_TEST_POSTGRES_URL` 时自动跳过的 PostgreSQL 集成套件 |
| 后端 Workers Vitest CI 套件 | `.github/workflows/test.yml` L115 完整套件（Commit 8 修复 Vite 8 `pg-protocol` 解析后执行，`--maxWorkers=1`） | **47 passed (47 files) \| 662 passed (662 tests)** | 含全部 9 个 `*-migration.workers.spec.ts` 与 D1/DO/Retention 回归 |
| 前端代码质量与规范 | `attendance` 定向 Prettier/ESLint、`check:native-dialogs`、`typecheck:e2e`、`check-locale-parity --fail-on-missing`、`generate-constants.js`、`build:all`（微调与锁版本后重跑） | 全部退出 0；`admin`/`enterprise`/`personal` 三端全部成功构建 | `generate-constants.js` 零额外产出 |
| CI Playwright 回归 | mock-auth Chromium：`auth-ui`、`recycle-bin`、`delete-undo/`、`enterprise-assets/`、`api-token/`、`cloudflare-home/`、`calendar/`、`mobile-task-runtime/`（Commit 8 + Batch 6 微调后全量执行） | **276 passed \| 1 skipped \| 0 failed** | 跳过 1 条为需真实在线后端环境的 `e2e/delete-undo/role-delete-undo.real.spec.ts` |
| Personal Assets Playwright | `pnpm --dir platform run test:e2e:personal-assets`（Commit 8 + Batch 6 微调后执行） | **32 passed \| 0 failed** | `@hodor/web-personal` 核心 2D/3D 资产模型与页面 |

---

## 5. Batch 7 Cloudflare 线上部署落地与后续建议

### 5.1 安全发布流程与线上验证结果

为严格遵守仓库脱敏规范，始终保持公开模板 `server/apps/server/wrangler.jsonc`（占位 ID）与 `platform/.env.production` 原样不变，通过生成并即时销毁**本地临时未跟踪发布配置**完成 Cloudflare 生产环境上线：

- **发布前契约与 Dry-Run 校验**：
  - 使用本地临时未跟踪配置对远端 D1 执行只读结构契约校验（`d1-contract/worker-schema.sql`）：执行 60 条查询、`success: true`、`num_tables: 81`；
  - 完成生产配置 `wrangler deploy --dry-run` 与带生产环境变量的全量前端 `build:all`，并在构建后立即还原 `platform/public/version.json`（临时配置文件在 Worker 发布后同步删除，工作区保持洁净）。
- **后端 Worker 与 3 个 Pages 生产上线**：
  - 后端 Worker 发布上线并切换至 100% 生产流量，经 `wrangler versions view` 与 `wrangler secret list` 核验原有全部 13 项远端 Secrets 及 D1/KV/R2/AI/DO 绑定完整保留；
  - 前端 `gate`（Admin）、`gate-enterprise`（Enterprise）、`gate-personal`（Personal）全部 3 个 Cloudflare Pages 项目均通过 `--branch=dev` 发布至 Production，并对线上公开端点的 `/version.json` 与 `/remoteEntry.js` 抽检确认返回 HTTP 200 及本次统一发布版本号。

### 5.2 后续待办与长期优化建议

1. **PostgreSQL 集成测试补充覆盖**：可在配置 `ONE_GATE_TEST_POSTGRES_URL` 或通过 GitHub Actions `postgresql` Job 自动验证全部 PostgreSQL 集成套件（本次本地跳过 11 个文件 / 186 条用例）。
2. **Module Federation 版本升级策略**：日后若需将 `@module-federation/vite` 从 `1.16.12` / `@module-federation/enhanced` 从 `2.6.0` 向上升级，须在 `@hodor/web-enterprise` 独立运行模式下多轮复测冷启动渲染稳定性后再解除精确锁版本。
3. **沉淀本地安全发布脚本**：可将“读取线上非敏感配置 / 生成本地临时 Wrangler 配置 / D1 只读契约检验 / 版本戳盖章构建 / Worker 与 3 个 Pages 发布 / 自动清理还原”固化为本地运维脚本（不入库任何真实 ID、邮箱与密钥），降低后续手工发布失误率。
