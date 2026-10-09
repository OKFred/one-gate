# One Gate

[English](README.md) · [MIT 许可证](LICENSE)

One Gate 是基于 Hono 和 React 的管理与业务应用工作区。后端支持 Node.js + SQLite
和 Cloudflare Workers + D1；前端包含管理端、企业端、个人端与共享 UI 库。

现有功能包括用户、角色、部门、SSO、TOTP 二次门禁、定时任务及通用回收站。
部门支持 30 天恢复窗口；删除人仍具备删除权限时，可在 15 秒内撤销自己的删除。

## 本地启动

使用 [.nvmrc](.nvmrc) 指定的 Node.js 版本和 pnpm 11.5.0。`server/` 与 `platform/`
分别安装依赖；内部 `@hodor/*` 包名保持兼容。

```sh
git clone https://github.com/OKFred/one-gate.git
cd one-gate/server
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.dev.vars
```

初始化前编辑 `server/apps/server/.dev.vars`：

- 设置 `DB_FILE_NAME=file:./local.db`，为 `SUPER_ADMIN_PASSWORD` 和 `JWT_SECRET` 设置独立随机值。
- 分别生成两个 32 字节 Base64 密钥，填入 `HODOR_AUTH_MASTER_KEY` 与
  `MOBILE_SENSITIVE_DATA_KEY`。每次运行
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` 可生成一个新值。
- 使用移动端发布功能时，为 `MOBILE_RELEASE_PUBLISH_TOKEN` 设置随机令牌。
- `HODOR_ALLOWED_WEB_ORIGINS` 保留本地地址；使用企业端、个人端时添加 5174、5175 端口。

在 `server/` 中生成本地 TOTP 注册材料，并初始化**新的本地数据库**：

```sh
pnpm run totp:enroll --environment=local --sync-dev-vars
pnpm --filter @hodor/server exec tsx --env-file=.dev.vars ../../packages/core/src/db/initTable.ts node
pnpm run dev
```

在本机打开生成的 `.secrets/totp-gate.local.html`，用验证器扫码。该文件含本地密钥，
不可上传或提交。后端地址为 `http://localhost:8787`。初始化会创建配置的管理员账号；
这个初始化命令不是已有数据库的升级流程。

另开终端，从仓库根目录启动管理端：

```sh
cd platform
pnpm install --frozen-lockfile
pnpm run dev:admin
```

访问 `http://localhost:5173`。开发 API 地址在 `platform/.env.development` 中，
可用 `.env.development.local` 覆盖。企业端、个人端分别使用 `dev:enterprise`、
`dev:personal`，或用 `dev:all` 一起启动。

## 验证与部署

[公开 CI](.github/workflows/test.yml) 使用 GitHub 托管 Linux runner 和测试配置，执行
Node 测试、Worker/D1 定向回归、前端类型检查与构建、模拟浏览器测试和敏感信息扫描。
未提供邮件凭证时，真实邮件发送测试跳过。

CI 不执行生产部署。自行部署时需创建自己的资源，填写
[`server/apps/server/wrangler.jsonc`](server/apps/server/wrangler.jsonc) 中的占位项，
单独配置所需密钥，并在发布前执行版本化 D1 迁移。参见[部署说明](docs/deployment.md)。
本仓库不提供已有生产环境的凭证或资源。

## 分支、历史与许可证

开发主分支为 `main`。新仓库采用清理后的独立历史，请重新克隆，避免合入原仓库历史。
详见[迁移说明](docs/public-migration.md)。

项目代码使用 [MIT 许可证](LICENSE)，第三方依赖与内嵌代码保留各自许可证和归属说明。
