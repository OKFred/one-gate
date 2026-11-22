# AI 协作工作流指南 (Verification-Driven Workflow)

本仓库采用**验证驱动（Verification-Driven）**与**硬门禁优先（Guardrails-in-Code）**协作规范：

## 1. 先查地图，再动手

- 定位任意页面、模块、路由或既有 E2E 测试，优先查阅 [docs/feature-map.md](../docs/feature-map.md)。
- 仅当开发者明确要求设计文档时，再于 `docs/` 创建方案文档；日常迭代不强求输出 `docs/MMDD-*` 过程三件套。

## 2. 硬门禁优先于文档提醒

- 代码风格、禁用 `any`、禁用 `t() || 'fallback'`、禁用原生 `alert`/`confirm`/`prompt`、跨包导入边界、Drizzle `.default()` 禁令与功能地图新鲜度均已接入 ESLint、`pnpm run check:architecture`、`pnpm run contracts:check` 与 `pnpm run feature-map:check`。
- 在仓库根目录执行 `pnpm run verify:fast` 作为最低静态门禁门槛；仅修改单一端时也应保持全链路门禁可通过。

## 3. 自测证据与回归闭环

- **前端/UI 或交互改动**：完成后必须用 Playwright 或浏览器实际走一遍关键交互路径，确认无 Console Error / PageError 与非预期 4xx/5xx，并保留验证结果或截图作为验收证据。
- **契约或后端接口改动**：涉及表结构/路由/权限变动时执行 `pnpm run sync:all`，并补充或更新对应的 Vitest / Playwright 用例。
- **同一个错误不犯第二次**：通过复盘、审查或实机发现的非一次性缺陷，除修复当前点位外，应优先评估能否固化进 ESLint、`scripts/check-architecture.mjs`、`packages/contracts/scripts/validate.ts` 或对应测试套件。

## 4. 规范修改限制

除非属于以下两种例外情况，否则严禁擅自修改 `.agents/` 目录下的规范文档：
1. 开发者显式要求调整或简化规范；
2. 业务需求与现有规范存在不可调和冲突，并已获开发者明确裁决。
