# 本地 OpenAPI 文档路由修复实际落地

## 问题与根因

后端设计上只在 `NODE_ENV` 不是 `production` 时注册 `/doc`、`/doc_ref`
和 `/doc.json`，生产不提供文档是预期的安全边界。

本地 Node 开发命令已通过 `.dev.vars` 传入 `NODE_ENV=development`，但本地
Cloudflare Worker 开发命令直接读取 `wrangler.jsonc` 的生产变量，导致它以
`NODE_ENV=production` 启动并返回文档路由 404。

## 实际改动

- 保留生产 `NODE_ENV=production` 配置和生产文档 404 行为。
- `worker:dev` 命令显式增加 `--var NODE_ENV:development`，仅覆盖本地 Wrangler 开发进程。
- 新增真实 Hono 请求回归测试，覆盖本地文档可用、生产文档关闭与开发命令配置。

## 与计划的差异

开始时曾考虑为生产增加显式文档开关；在确认生产不需要文档后已撤销该方向。
最终只修复本地 Wrangler 开发命令，没有扩大生产攻击面。

## 验证结果

- 严格 TypeScript 检查通过。
- 文档路由及客户端部署相关测试共 5 个文件、14 项测试通过。
- `NODE_ENV=development` 时 `/doc`、`/doc_ref`、`/doc.json` 均返回 HTTP 200。
- `NODE_ENV=production` 时三条路由均返回 HTTP 404。
- Worker `deploy --dry-run` 通过，生产 bundle 仍使用 `NODE_ENV=production`。
- Wrangler 本地命令已识别 CLI 环境变量覆盖；但当前验证环境的 AI remote binding 停在远程连接阶段，未完成 Wrangler HTTP 监听，该限制不影响 Hono 路由回归结果。

## 后续建议

- 本地 Node 模式使用 `pnpm dev`，本地 Worker 模式使用 `pnpm worker:dev`。
- 不要使用生产 `.env` 或 `pnpm start` 作为本地开发入口。
