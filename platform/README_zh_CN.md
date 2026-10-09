# One Gate 前端

[English](README.md) · [完整启动说明](../README_zh_CN.md)

此 pnpm 工作区包含 `apps/admin`、`apps/enterprise`、`apps/personal` 三个 React 应用，
以及 `packages/ui` 中的共享组件与 API 客户端。使用 `../.nvmrc` 中的 Node.js 版本及 pnpm 11.5.0。

```sh
pnpm install --frozen-lockfile
pnpm dev:admin
```

管理端端口为 5173，企业端、个人端为 5174、5175。其他启动命令为 `dev:enterprise`、
`dev:personal`、`dev:all`。`.env.development` 中的 `VITE_SERVER_URL` 默认为
`http://localhost:8787`；使用 `.env.development.local` 覆盖本地配置。
Vite 环境变量是公开的浏览器配置，不能存储密钥。

`pnpm build:all` 执行三个应用的类型检查与构建，`pnpm typecheck:e2e` 检查浏览器测试类型。
公开 CI 的登录、回收站和撤销测试使用本地预览及模拟接口。真实部署测试须先复制
`.env.playwright.example` 为 `.env.playwright.local`，并配置自己的测试环境和账号。
