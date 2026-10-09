# One Gate frontend

[Project setup](../README.md) · [中文说明](../README_zh_CN.md)

This pnpm workspace contains React applications in `apps/admin`,
`apps/enterprise` and `apps/personal`, plus shared components and API clients in
`packages/ui`. Use the Node.js version in `../.nvmrc` and pnpm 11.5.0.

```sh
pnpm install --frozen-lockfile
pnpm dev:admin
```

The admin app runs on port 5173; enterprise and personal use 5174 and 5175.
Use `dev:enterprise`, `dev:personal` or `dev:all` as needed.
`VITE_SERVER_URL` defaults to `http://localhost:8787` in `.env.development`.
Override it in `.env.development.local`; Vite variables are public browser
configuration and must not contain secrets.

`pnpm build:all` checks application types and builds all three apps.
`pnpm typecheck:e2e` checks browser-test types. Public CI runs mocked auth,
recycle-bin and undo tests against the local preview. For an explicitly
configured deployment, copy `.env.playwright.example` to `.env.playwright.local`
and configure your own test account before using authenticated tests.
