# Deployment configuration

The checked-in configuration is a template for your own infrastructure. Public
GitHub Actions only validate code; they do not deploy or hold production secrets.

## Node.js

Follow the root README for local setup. For a deployed service, supply private
environment variables, a persistent SQLite location and an HTTPS reverse proxy.
Build with `pnpm run build` from `server/`; run the built server with the same
private environment (`pnpm start` does not load `.dev.vars` automatically).
Back up your database and use the documented migration for an existing schema.

## Cloudflare Workers

1. Create your own D1 database, KV namespace and R2 bucket. Keep binding names
   `DB`, `KV` and `BUCKET`; replace the zero-valued IDs and resource names in
   `server/apps/server/wrangler.jsonc`. Set your account with private deployment
   environment configuration. Internal database scripts currently use `hodor_db`.
2. Configure a domain or opt into `workers_dev` for your Worker. Set allowed
   origins to the exact origins of your deployed frontends, including
   `MOBILE_OPS_ALLOWED_ORIGINS` when used.
3. Supply every secret in `secrets.required` using your private deployment
   process or `wrangler secret put`. Generate independent credentials; never
   copy test fixtures into production. The AI REST fallback also requires your
   own `CLOUDFLARE_ACCOUNT_ID` and API token when not using the Worker AI binding.
4. Back up existing data and pause relevant writes for controlled migrations.
   From `server/`, run `db:migrate:worker:remote` and `db:check:worker:remote`
   against your configured resources before deploying the Worker. Review the
   migration-specific operational notes under `docs/`; do not initialize an
   existing database as if it were empty.
5. Build the frontends with your `VITE_SERVER_URL`, `VITE_ENTERPRISE_URL` and
   `VITE_PERSONAL_URL`, then publish each application's `dist` to your own host.
   These frontend variables are public build settings, not places for secrets.

Use a private deployment pipeline with scoped credentials and an explicit
release process. Public PR checks must not run on machines that hold production
credentials. The repository's Worker dry-run only checks bundling; local
Worker/D1 tests do not prove your remote account configuration.

See the [Wrangler configuration reference](https://developers.cloudflare.com/workers/wrangler/configuration/)
for current deployment options.
