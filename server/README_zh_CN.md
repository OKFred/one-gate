# One Gate 后端

[English](readme.md) · [项目启动](../README_zh_CN.md) · [部署说明](../docs/deployment.md)

此 pnpm 工作区包含 `apps/server/` 中的 Hono 宿主，以及 `packages/` 下的
`core`、`admin`、`enterprise`、`personal` 包。支持 Node.js/SQLite 和 Workers/D1。
使用 `../.nvmrc` 指定的 Node.js 版本及 pnpm 11.5.0。

先按根目录说明创建本地配置并初始化新数据库，再运行 `pnpm dev`。环境变量必须在
初始化模块导入前加载。准备好 `apps/server/.dev.vars` 后，在 `server/` 中执行：

```sh
pnpm --filter @hodor/server exec tsx --env-file=.dev.vars ../../packages/core/src/db/initTable.ts node
pnpm dev
```

常用命令：

- `pnpm build`：构建 Node 宿主。
- `pnpm worker:dev`：Wrangler 开发模式，启用远程绑定前检查目标资源。
- `pnpm worker:types`：根据 `apps/server/wrangler.jsonc` 重新生成类型。
- `pnpm db:migrate:worker:local`：对本地 D1 执行版本化迁移。
- `pnpm db:check:worker:local`：验证本地 D1 结构契约。

Node 测试在 `apps/server/` 中执行
`pnpm exec vitest run --config vitest.config.node.mts`，仅使用测试环境变量。
公开 CI 提供完整可复现的测试配置。已有数据库应使用对应迁移流程；生产部署单独管理。
