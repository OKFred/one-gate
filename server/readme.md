# One Gate backend

[中文](README_zh_CN.md) · [Project setup](../README.md) · [Deployment](../docs/deployment.md)

This pnpm workspace contains the Hono host in `apps/server/` and the shared
`core`, `admin`, `enterprise` and `personal` packages under `packages/`.
It supports Node.js/SQLite and Cloudflare Workers/D1. Use the Node.js version in
`../.nvmrc` and pnpm 11.5.0.

Follow the root README to create private local configuration and initialize a
new database before running `pnpm dev`. Environment values must be loaded before
initialization imports run. For a configured local `.dev.vars`, from `server/`:

```sh
pnpm --filter @hodor/server exec tsx --env-file=.dev.vars ../../packages/core/src/db/initTable.ts node
pnpm dev
```

Useful commands from this directory:

- `pnpm build`: build the Node host.
- `pnpm worker:dev`: run Wrangler development; review bindings before enabling remote access.
- `pnpm worker:types`: regenerate types from `apps/server/wrangler.jsonc`.
- `pnpm db:migrate:worker:local`: apply versioned migrations to local D1.
- `pnpm db:check:worker:local`: verify the local D1 schema contract.

For Node tests, change to `apps/server/` and run
`pnpm exec vitest run --config vitest.config.node.mts` with test-only environment
values. Public CI documents the complete reproducible test configuration.
Do not use a production database or real credentials for unit tests.

Existing databases require their migration procedure, not fresh initialization.
Production deployment is managed separately from public CI.
