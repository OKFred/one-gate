# One Gate

[中文](README_zh_CN.md) · [MIT license](LICENSE)

One Gate is a Hono and React administration workspace for authentication,
permissions and business applications. The backend runs on Node.js with SQLite
or Cloudflare Workers with D1. The frontend includes admin, enterprise and
personal applications with a shared UI package.

Features include users, roles and departments, SSO and a TOTP security gate,
task scheduling, and a shared recycle bin with a 30-day recovery window.
Departments also support undoing your own deletion within 15 seconds while you
still have delete permission.

## Local development

Use the Node.js version in [.nvmrc](.nvmrc) and pnpm 11.5.0. The backend and
frontend are separate pnpm workspaces. Internal `@hodor/*` package names remain
unchanged.

```sh
git clone https://github.com/OKFred/one-gate.git
cd one-gate/server
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.dev.vars
```

Edit `server/apps/server/.dev.vars` before initialization:

- Set `DB_FILE_NAME=file:./local.db`, a unique `SUPER_ADMIN_PASSWORD` and
  `JWT_SECRET`.
- Generate independent 32-byte Base64 values for `HODOR_AUTH_MASTER_KEY` and
  `MOBILE_SENSITIVE_DATA_KEY`, for example with
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
- Set `MOBILE_RELEASE_PUBLISH_TOKEN` to a random token if using mobile publishing.
- Keep local origins in `HODOR_ALLOWED_WEB_ORIGINS`; add ports 5174 and 5175 when
  using the other frontend applications.

From `server/`, generate local TOTP enrollment and initialize a **new local** database:

```sh
pnpm run totp:enroll --environment=local --sync-dev-vars
pnpm --filter @hodor/server exec tsx --env-file=.dev.vars ../../packages/core/src/db/initTable.ts node
pnpm run dev
```

Open the generated `.secrets/totp-gate.local.html` locally to enroll an
authenticator. This file contains your local TOTP secret and must stay private.
The backend listens on `http://localhost:8787`. Database initialization creates
the configured administrator; it is not an upgrade procedure for an existing database.

In another terminal, from the repository root:

```sh
cd platform
pnpm install --frozen-lockfile
pnpm run dev:admin
```

Open `http://localhost:5173`. The development API URL is configured in
`platform/.env.development`; override it in `.env.development.local` if needed.
Use `dev:enterprise`, `dev:personal` or `dev:all` for the other applications.

## Verification and deployment

[CI](.github/workflows/test.yml) runs on GitHub-hosted Linux runners with
test-only configuration: Node tests, focused Worker/D1 regression tests,
frontend types/builds, mocked browser tests and secret scanning. Real email
delivery tests are skipped without explicit mail credentials.

CI does not deploy production services. For your own deployment, provision your
resources, replace the placeholders in
[`server/apps/server/wrangler.jsonc`](server/apps/server/wrangler.jsonc), configure
the required secrets separately and apply the versioned D1 migrations before
deploying. See [deployment notes](docs/deployment.md). No existing production
credentials or resources are provided by this repository.

## Repository history and license

`main` is the development branch. This is an independent repository with a
sanitized history boundary; clone it freshly instead of merging old repository
history. See [migration notes](docs/public-migration.md).

Project code is available under the [MIT license](LICENSE). Bundled third-party
code and dependencies retain their respective licenses and notices.
