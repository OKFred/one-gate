# Playwright 登录态持久化详细设计

## 1. 背景与目标

当前生产验收主要通过附加已打开 Chrome 的 CDP 会话完成，Chrome 会周期性要求用户批准远程调试，且登录态过期后需要重新捕获授权头。后续改为项目级 Playwright 测试，并在首次运行时通过独立 Chrome 手工登录一次，将可复用的浏览器状态保存为本地 JSON。

目标如下：

- 不在代码、聊天、命令行或 Git 中保存账号密码。
- 首次 headed 运行保存 Cookie、localStorage、IndexedDB 和 sessionStorage。
- 后续测试自动恢复登录态，默认使用只读生产 smoke test。
- 前端地址、允许持久化的 Origin 和可选设备断言由部署者本地配置，仓库不写死域名。
- 登录态文件、失败截图和报告全部排除出 Git；视频和 trace 显式关闭，不生成对应产物。
- 状态过期时给出明确的重新认证命令。

## 2. 状态文件设计

Playwright 原生 `browserContext.storageState()` 保存：

- Cookie
- localStorage
- IndexedDB（显式启用 `indexedDB: true`）

Playwright 原生不持久化 sessionStorage，因此在标准状态外封装一层单文件 Bundle：

- `platform/playwright/.auth/hodor.auth-state.json`

Bundle 中的 `storageState` 保存 Cookie、localStorage 和 IndexedDB，`sessionStorageByOrigin` 按 Origin 保存 sessionStorage 键值，并由自动 fixture 在页面脚本执行前恢复。该文件属于可冒用会话的敏感数据，只允许保留在本机。

保存前只保留 `HODOR_E2E_ALLOWED_ORIGINS` 配置的范围；OAuth 登录过程中产生的第三方 Cookie、localStorage、IndexedDB 和 sessionStorage 不进入 Hodor 状态文件。没有已打开页面的允许 Origin 视为没有 sessionStorage，不为采集状态额外导航。

部署相关参数通过本地文件配置：

- 复制 `platform/.env.playwright.example` 为 `platform/.env.playwright.local`。
- `HODOR_E2E_BASE_URL`：必填，管理前端的 HTTP(S) Origin。
- `HODOR_E2E_ALLOWED_ORIGINS`：可选，逗号分隔的前端/API Origin；前端 Origin 总会自动包含。
- `HODOR_E2E_DEVICE_CLIENT_ID`：可选；配置后 smoke test 额外确认该设备可见。

`.env.playwright.local` 由现有 `*.local` 规则排除出 Git。Shell 中的同名环境变量优先于本地文件，方便临时切换部署目标。

不持久化浏览器缓存、Service Worker 缓存、下载文件、扩展私有数据或系统密码库；测试不应依赖这些非确定性状态。

## 3. 首次认证流程

```text
pnpm test:e2e:auth
  -> 从 .env.playwright.local 读取目标部署地址
  -> Playwright 启动独立 Chrome
  -> 打开生产设备管理页
  -> 用户手工登录
  -> 等待设备管理页和 userInfo.token 就绪
  -> 按配置过滤允许的 Origin/Domain
  -> 保存 hodor.auth-state.json
```

认证项目使用空白 BrowserContext，不读取旧状态；等待上限为五分钟。脚本只输出状态文件路径，不输出 Cookie、Token 或 localStorage 内容。

## 4. 测试恢复流程

```text
pnpm test:e2e
  -> Playwright config 从 auth-state.json 加载 storageState
  -> 自动 fixture 注册 sessionStorage init script
  -> 创建页面并恢复对应 Origin 的 sessionStorage
  -> 执行只读 smoke test
```

首个 smoke test验证：

- 能进入 `/admin/mobile/device`，不会跳到登录页。
- 页面显示设备管理标题。
- 配置 `HODOR_E2E_DEVICE_CLIENT_ID` 时，对应设备可见；未配置时只验证页面和登录态。
- 不点击新增、删除、下发任务或其他写操作。

## 5. 安全与隔离

- `.gitignore` 排除 `playwright/.auth/`、`playwright-report/`、`test-results/` 和 `blob-report/`。
- 不在测试日志中读取或输出认证值。
- 认证状态仅供本机使用；生产状态不进入 GitHub Actions Artifact。
- 后续若接入 CI，应创建最小权限测试账号，并通过 CI Secret 独立生成短期状态，不能上传本机 superadmin 状态。
- 状态失效后删除旧 JSON 并重新执行 `pnpm test:e2e:auth`。

## 6. 工程结构

```text
platform/
  .env.playwright.example
  playwright.config.ts
  e2e/
    auth.setup.ts
    fixtures.ts
    support/auth-state.ts
    support/test-environment.ts
    smoke/hodor-device.spec.ts
  playwright/.auth/        # 运行时生成，Git 忽略
```

## 7. 验证计划

- Windows 环境运行现有 Admin TypeScript 基线和修改后对比。
- 运行覆盖 Vite 配置与 Playwright E2E 文件的 Node TypeScript 检查。
- 检查仓库跟踪文件不包含具体部署域名，并验证本地配置文件被 Git 忽略。
- 运行认证 setup，确认单一 Bundle JSON 生成且内容不打印。
- 关闭认证窗口后运行 headless smoke test，确认状态可恢复。
- 对新增文件执行 ESLint/Prettier。
- 执行 `git diff --check`、LF/UTF-8/BOM、无新增 `any/as any` 检查。

## 8. 官方依据

- Playwright Authentication：<https://playwright.dev/docs/auth>
- BrowserContext storageState：<https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state>

官方文档确认 storage state 可包含 Cookie、localStorage 和 IndexedDB；sessionStorage 需要使用自定义保存和 `addInitScript` 恢复。
