# Playwright 登录态持久化实际落地

## 1. 落地结果

已在 `platform` 建立项目级 Playwright 认证与只读生产冒烟测试：首次使用独立 Chrome 手工登录后，将 Cookie、localStorage、IndexedDB 和按 Origin 采集的 sessionStorage 封装到同一个本地 JSON；后续测试直接恢复该 Bundle，不需要在聊天、环境变量或仓库中保存账号密码。

生产认证状态已于 2026-08-12 首次生成，随后关闭认证 Chrome，并以新的 headless BrowserContext 成功访问生产设备管理页、确认设备 `mobile_35249311637582` 可见。测试未执行新增、编辑、删除或任务下发。

## 2. 实际变更

- 锁定 `@playwright/test@1.62.1`，新增认证、headless、headed 和类型检查命令。
- 新增 Playwright 配置、认证 setup、sessionStorage 自动 fixture、认证 Bundle 读写工具和只读设备页 smoke test；相关文件纳入现有 `tsconfig.node.json`。
- 新增 `.env.playwright.example` 和部署配置加载器；前端地址、允许 Origin 与可选设备 ID 不再写死在仓库代码中。
- 认证状态只保留部署者配置的 Origin 范围，OAuth 第三方状态不会写入 Bundle。
- `.gitignore` 排除认证 JSON、测试结果和 HTML 报告。
- 失败时仅允许生成截图；`video` 和 `trace` 均在配置中显式设为 `off`。

## 3. 与计划的差异

- 首轮手工认证遇到 OAuth 页面跳转导致的 `Execution context was destroyed`。认证轮询已改为容忍跳转期间的临时执行上下文失效，第二轮认证成功。
- 原计划在失败时保留视频和 trace；根据实际使用要求改为永久关闭，并清理了首轮生成的测试产物。
- 原计划使用自定义名称的独立 TypeScript 配置；为避免编辑器把 `playwright.config.ts` 放入推断项目，最终统一纳入根 `tsconfig.json` 已引用的 `tsconfig.node.json`。
- Windows 挂载目录的权限位不能可靠表达 Windows ACL。实现仍尝试将认证文件设为 `0600`，实际安全边界以 Windows 用户目录权限和 Git 忽略规则为准。
- 初次落地后的复用审查发现域名和设备 ID 与单一生产环境耦合；最终改为 `.env.playwright.local`，并让 shell 环境变量具有更高优先级。
- 通用化后的首次生产 smoke 两次停留在微前端加载进度条，确认不是域名配置错误，而是默认 5 秒断言阈值小于生产微前端的实际加载时间；最终统一调整为 15 秒，后续验证通过。

## 4. 真实验证

- 修改前 Admin TypeScript 基线：通过。
- `pnpm run typecheck:e2e`：通过。
- Playwright 变更文件 ESLint：通过。
- Playwright、文档和配置 Prettier：通过；`.gitignore` 已机械转换为 LF。
- `pnpm run test:e2e:auth`：通过，1 个认证 setup 成功。
- 使用临时示例域名覆盖本地配置执行 `playwright test --list`：通过，证明 shell 环境变量可覆盖本地部署文件且无需修改源码。
- `pnpm run test:e2e`：通过，1 个生产只读 smoke test 成功，最新一轮耗时 21.3 秒。
- 单一认证 Bundle 已生成并由 `.gitignore` 命中；只校验结构和数量，未输出任何 Cookie、Token 或存储值。
- `platform` 的 Git 跟踪文件中不存在当前生产前端/API 域名或设备 ID；真实值只保留在被忽略的 `.env.playwright.local`。
- 测试完成后检查 `platform`，没有 `.webm`、`trace.zip` 或其他 zip trace 产物。

## 5. 使用方式

```bash
cd platform

# 首次使用或切换部署目标时
cp .env.playwright.example .env.playwright.local
# 编辑 HODOR_E2E_BASE_URL、允许 Origin 和可选设备 ID

# 登录态失效时，启动独立 Chrome 手工认证并覆盖本地 Bundle
pnpm test:e2e:auth

# 默认 headless，只读生产冒烟
pnpm test:e2e

# 需要观察页面时使用 headed 模式
pnpm test:e2e:headed
```

认证文件位于 `platform/playwright/.auth/hodor.auth-state.json`。它等同于可复用的已登录会话，不应复制到聊天、提交到 Git 或上传为 CI Artifact。

## 6. 数据与部署影响

本次没有修改后端接口、数据库、D1、EMQX、Cloudflare 配置或生产数据，也不需要执行 DDL、迁移或重新部署服务。
