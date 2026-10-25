# PostgreSQL deployment

PostgreSQL is an optional backend. D1 and SQLite remain supported. Select one
backend for a deployment; PostgreSQL never falls back to a SQLite database.

The adapter depends on PostgreSQL and Drizzle/pg, with no Supabase-specific
business logic. Hosted Supabase is this iteration's validation environment.
Self-hosted Supabase, another PostgreSQL provider, or private network/Tunnel
connectivity can be considered later through deployment configuration. This
iteration does not implement Zero Trust, Tunnel ingress or Worker-specific
network access policies.

The first PostgreSQL release supports password/JWT/TOTP authentication, users,
roles, departments, permissions, menus, API tokens, i18n, application preferences,
logs, enterprise tenants/assets, department/role recycle-bin operations and
Cloudflare usage overview/refresh. AI chat remains outside this capability set.
Unported modules return HTTP 501 with `POSTGRESQL_CAPABILITY_UNAVAILABLE`.
SSO, email alerts, mobile operations, arbitrary business Cron jobs and other
unported modules are unavailable. Machine tokens can use the asset mapping
API only. API tokens do not inherit their creator's tenant access.

## Database initialization

Use PostgreSQL 17 or later. Prepare a dedicated application schema and account
with schema `USAGE, CREATE`, object ownership for migrations and ordinary DML
permissions. No database-wide `CREATE`, role administration, superuser or
`BYPASSRLS` privilege is needed. Keep the schema outside Supabase's exposed
Data API schemas; access control is enforced by One Gate's backend, with
explicit tenant predicates in database writes.

An administrator can bootstrap a fresh namespace with:

```sql
CREATE SCHEMA one_gate_validation;
REVOKE ALL ON SCHEMA one_gate_validation FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA one_gate_validation TO one_gate_validation;
```

Create the matching login separately. Keep credentials in a private file
outside the checkout, for example:

```dotenv
DATABASE_URL=postgresql://APPLICATION_USER:PERCENT_ENCODED_PASSWORD@DATABASE_HOST:5432/postgres
PG_SCHEMA=one_gate_validation
PG_SSL_CA_FILE=C:/private/postgresql-ca.crt
```

Remote Node connections and schema tools always verify TLS. Supply the provider's
root CA when needed; do not disable certificate verification. A Supabase
**Session pooler** connection supports an IPv4-only development machine. The
Supabase account name through this pooler includes the project reference.

From `server/`, inspect the migration and seed status before applying changes:

```sh
pnpm run db:generate:postgresql
pnpm exec tsx --env-file=C:/private/postgresql.env scripts/postgresql/migrate.ts
pnpm exec tsx --env-file=C:/private/postgresql.env scripts/postgresql/migrate.ts --apply
pnpm exec tsx --env-file=C:/private/postgresql.env scripts/postgresql/seed.ts
pnpm exec tsx --env-file=C:/private/postgresql.env scripts/postgresql/seed.ts --apply
```

The migration requires an explicit schema, applies DDL and its marker in one
transaction, rejects unmarked existing tables, and checks migration and schema
fingerprints on repeated execution. `db:generate:postgresql --write` updates
fresh-database DDL only; existing databases require a new numbered migration.

The seed inserts missing metadata without deleting custom rows or overwriting
existing accounts, passwords, disabled states or translations. To bootstrap
the first administrator, add `PG_SEED_ADMIN_USERNAME` and
`PG_SEED_ADMIN_PASSWORD` to the private file and run seed with both `--apply`
and `--create-admin`. Remove these bootstrap values after use. Administrator
creation is never implicit. Do not run the SQLite `db:init` command against
an existing PostgreSQL database.

## Node.js

Add `DATABASE_BACKEND=postgresql` to the private runtime environment alongside
the connection settings and existing JWT/TOTP/master keys. Start the ordinary
Node entry point. It uses a bounded `pg.Pool`; minute maintenance runs only the
registered retention and Cloudflare usage maintenance for this backend. Requests use independent
transaction scopes and a transaction-local schema search path.

The first release serializes critical writes with one application-owned guard
row. Permissions and business references are rechecked after obtaining that
lock. This deliberately favors consistency over maximum write throughput.
Configuration primary-flag changes and their following writes share one
transaction. Logs and the application's existing permission-cache invalidation
remain in use.

## Cloudflare Workers

Use `server/apps/server/wrangler.postgresql.jsonc`, which requires Hyperdrive,
KV and the TOTP Durable Object without a D1 binding. Replace placeholder IDs
and configure the listed secrets in your deployment environment.

Create a Hyperdrive configuration with **query caching disabled** and a
Supabase **direct database endpoint** as its origin. Avoid chaining Hyperdrive
with the Supabase transaction pooler. Keep application and deployment
credentials out of the committed configuration.

```sh
# From server/apps/server; the connection value belongs in your private shell environment.
# CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=<private local database URL>
pnpm run worker:dev:postgresql
pnpm run worker:types:postgresql
pnpm exec wrangler deploy --config wrangler.postgresql.jsonc --dry-run
```

Each fetch or scheduled event creates and closes its own `pg.Client`; clients
are never shared between Worker requests. Started transactions and registered
request background tasks finish before the connection closes. The same client
serializes transaction boundaries. Every repository uses the same PostgreSQL
database for identity, tenant membership and assets.

Local Hyperdrive bindings connect directly to the configured database and do
not exercise Cloudflare's remote pooling or query cache. Local workerd success,
Supabase database success and remote Hyperdrive acceptance are separate checks.

## Verification

The PostgreSQL test harness only resets freshly created schemas on a loopback
database. It refuses remote URLs, including Supabase. Set a private
`ONE_GATE_TEST_POSTGRES_URL` and run from `server/apps/server`:

```sh
pnpm exec vitest run --config vitest.config.postgresql.mts
```

This configuration requires the URL, uses one test worker and allows longer
database integration timeouts. Public CI provisions its own disposable
PostgreSQL 17 service and never connects to a deployment database.

Provider references: [Cloudflare Drizzle/pg integration](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/),
[Hyperdrive local development](https://developers.cloudflare.com/hyperdrive/configuration/local-development/),
[Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres),
[Supabase roles and permissions](https://supabase.com/docs/guides/database/postgres/roles).
