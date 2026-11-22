# Playwright 登录态持久化计划变更

## 1. 计划目标

在 `platform` 中加入项目级 Playwright 认证状态初始化与只读生产 smoke test，首次手工登录后复用 JSON 状态，不保存账号密码。

## 2. 预计变更

- `platform/package.json`
  - 增加锁定到 workspace 的 `@playwright/test` 开发依赖声明。
  - 增加 `test:e2e:auth`、`test:e2e` 和 `typecheck:e2e` 命令。
- `platform/pnpm-lock.yaml`
  - 同步 Playwright 直接依赖锁定信息。
- `platform/.gitignore`
  - 排除认证状态、测试输出和报告。
- `platform/.env.playwright.example`
  - 提供不含真实部署值的前端地址、允许 Origin 和可选设备断言模板。
- `platform/playwright.config.ts`
  - 定义手工认证和 Chromium smoke 两个项目。
- `platform/tsconfig.node.json`
  - 将 Playwright 配置、fixture 和测试纳入标准 Node TypeScript 项目，确保编辑器与命令行使用相同类型上下文。
- `platform/e2e/support/auth-state.ts`
  - 状态路径、sessionStorage JSON 类型和安全读取逻辑。
- `platform/e2e/support/test-environment.ts`
  - 通过 Vite 加载 `.env.playwright.local`，校验并归一化部署配置。
- `platform/e2e/auth.setup.ts`
  - 首次 headed 手工登录并保存两类状态。
- `platform/e2e/fixtures.ts`
  - 自动恢复 sessionStorage。
- `platform/e2e/smoke/hodor-device.spec.ts`
  - 只读生产设备页 smoke test。
- `docs/0812-Playwright登录态持久化(优化)实际落地.md`
  - 完成验证后记录计划差异与真实结果。

## 3. 公共命令

```bash
cd platform
cp .env.playwright.example .env.playwright.local
pnpm test:e2e:auth
pnpm test:e2e
pnpm typecheck:e2e
```

## 4. 数据与部署影响

- 不修改服务端、数据库、D1、EMQX 或生产配置。
- 不提交认证 JSON。
- 不提交 `.env.playwright.local`，仓库不包含具体部署域名。
- 不新增账号密码环境变量。
- 不把生产写操作加入 smoke test。

## 5. 验收标准

- 首次登录后生成同时包含 storage state 和 sessionStorage 的单一 Bundle JSON。
- 新 BrowserContext 能恢复登录并打开设备管理页。
- 使用不同域名时只需替换本地环境文件，无需修改测试源码。
- 登录态缺失或失效时给出明确重建提示。
- 状态和测试产物不会出现在 Git 状态中。
- TypeScript、ESLint、Prettier 和 Git 文本检查通过。
