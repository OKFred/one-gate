# 开发规范与工作导航 (Agent Guidance Index)

改动代码前先查地图、改动后靠工具链硬门禁与实机证据验收：

- **功能地图**：[docs/feature-map.md](../docs/feature-map.md)（自动生成全站路由、契约、菜单、源码与 E2E 测试对应关系；增删路由/契约后执行 `pnpm run feature-map:generate`）
- **验证入口**：改动后运行 `pnpm run verify:fast`（或针对改动域运行构建/单测/Playwright E2E）与 `git diff --check`
- **架构与工作流**：
  - [全局规范与注释原则](./global.md) (`./global.md`)
  - [验证驱动协作工作流](./workflow.md) (`./workflow.md`)
  - [后端开发规范](./backend.md) (`./backend.md`)（`server/` 改动重点参照，并同时遵守 `server/AGENTS.md`）
  - [前端开发规范](./frontend.md) (`./frontend.md`)（`platform/` 改动重点参照）
- **除草清单**：[docs/tech-debt-gardening.md](../docs/tech-debt-gardening.md)
