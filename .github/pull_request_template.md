## 改动摘要

- **改动目的与范围**：
- **路由 / 契约变更**：
  - [ ] 若新增、修改或删除路由与 JSON 契约，已执行 `pnpm run sync:all`（含 `pnpm run feature-map:generate`）并同步更新 `docs/feature-map.md`

## 验证证据

- [ ] `pnpm run verify:fast` 通过（贴出关键输出或结果）：
- [ ] 后端单测 / Workers 集成测试结果：
- [ ] Playwright E2E 测试命令与结果：

## UI 与实机验收（改动前端或页面行为时填写）

- [ ] 浏览器验证全程无未预期的 `console.error`、`pageerror` 与请求失败
- [ ] 关键交互路径已通过真实页面 / Playwright 复测，并附上截图或验证结论
- [ ] 已检查桌面端与移动端断点布局（无溢出、遮挡或错位）

## 防复发与技术债检查

- [ ] **防复发机制（若为 Bug 修复）**：本次从根因上补充了哪条 ESLint / 架构脚本 / 单测 / E2E 回归检查，确保同类错误不再发生？
- [ ] **技术债登记（若暂缓重构）**：超长文件或临时兼容逻辑是否已记录至 `docs/tech-debt-gardening.md`？
