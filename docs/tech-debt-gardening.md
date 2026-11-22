# 技术债与「园丁除草」清单 (Tech Debt Gardening)

本清单用于配合 `pnpm run check:architecture` 推进长期渐进重构，优先治理最容易导致 AI 与工程师继续模仿堆砌的大型文件与历史 `any` 热点。

> 每完成任意文件的减法或类型收紧，请顺手下调 [scripts/any-ratchet-baseline.json](../scripts/any-ratchet-baseline.json) 中的计数阈值并运行 `pnpm run check:architecture` 锁定成果。

---

## 一、超大源文件优先拆分清单（> 700 行，非自动生成数据）

| 行数 | 文件 | 建议拆分方向 |
| --- | --- | --- |
| 1194 | `platform/apps/enterprise/src/pages/executive/workflow/index.tsx` | 拆出节点属性面板、画布工具栏、工作流运行日志抽屉 |
| 1122 | `server/packages/admin/src/mobile/client-deployment/service.ts` | 拆分清单发布校验、包元数据解析与服务接口组装 |
| 906 | `server/packages/enterprise/src/asset/repository.ts` | 按资产主体、测点绑定与租户关联查询拆分子仓储 |
| 792 | `platform/apps/enterprise/src/features/asset-management/AssetDetails.tsx` | 拆出标识列表、分派记录与测点绑定三个独立 Tab 组件 |
| 776 | `platform/packages/ui/src/components/Crud/SchemaCrudPage.tsx` | 已抽离 `useCrudSchemas` / `useCrudDelete` / `CrudRowActions`（原 1005 行）；下批继续抽离查询分页与表单提交 Hook |
| 769 | `server/packages/enterprise/src/asset/repository.pg.ts` | 同 SQLite 仓储同步拆分以保持 PG/D1 映射对齐 |
| 750 | `platform/apps/admin/src/pages/mqtt/console/index.tsx` | 拆出连接管理面板、订阅配置与消息收发日志面板 |
| 725 | `server/packages/admin/src/system/department/service.ts` | 抽离软删除前置校验、权限树组装与纯 CRUD 端点 |
| 714 | `server/packages/personal/src/financial/service.ts` | 按收入、支出与汇总报表拆分子模块 |
| 711 | `platform/apps/enterprise/src/features/asset-management/TenantPage.tsx` | 拆出企业成员列表、API 令牌授权抽屉与新建弹窗 |
| 694 | `server/packages/admin/src/system/role/repository.pg.ts` | 拆出角色-权限关联与软删除恢复查询辅助 |

> 第一批已摘除大文件：`ContractFormRenderer.tsx`（845 → 423 行，已抽离 `remoteOptions`、`useDynamicSubSchemas`、`ContractComplexWidgets`）。

---

## 二、后端历史 `any` 棘轮 Top 热点

完整基线共 23 个文件 / 39 处（第一批已从 34 文件 / 118 处清零收敛 11 文件 / 79 处，下降 67%；见 [scripts/any-ratchet-baseline.json](../scripts/any-ratchet-baseline.json)），新增代码已由 `server/eslint.config.mjs` 与 `check-architecture.mjs` 全局禁止 `any`。建议优先从以下 Top 热点切入消债：

1. `server/packages/core/src/db/initPermissions.ts`（4 处）：补充权限定义与菜单映射结构化类型
2. `server/packages/core/src/middleware/errorHandler/businessError/index.ts`（4 处）：收窄业务异常元数据与参数类型
3. `server/packages/admin/src/ai/driver.ts`（3 处）：明确 AI 驱动适配器入参与返回契约
4. `server/packages/core/src/utils/env.ts`（3 处）：替换环境变量映射为明确的 Env 接口类型
5. `server/scripts/dependency-visualize.ts`（3 处）：补充模块依赖图 AST/节点类型定义
