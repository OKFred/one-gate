import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Client } from "pg";
import {
  migratePostgres,
  postgresMigrationChecksum,
  postgresMigrationId,
  postgresMigrationSql,
  postgresMigrations,
  postgresCatalogFingerprint,
  postgresToolOptions,
} from "../../../scripts/postgresql/migrate";
import {
  seedPostgres,
  postgresMenuSeeds,
  postgresPermissionSeeds,
} from "../../../scripts/postgresql/seed";
import { validatePostgresSchema } from "@hodor/core/db/postgresql/runtime";
import { verifyPassword } from "@hodor/core/utils/crypto";

const configured = Boolean(process.env.ONE_GATE_TEST_POSTGRES_URL);
describe.skipIf(!configured)(
  "real PostgreSQL migration and seed safety",
  () => {
    let client: Client;
    let schema: string;
    beforeAll(async () => {
      const target = new URL(process.env.ONE_GATE_TEST_POSTGRES_URL!);
      if (
        !["postgres:", "postgresql:"].includes(target.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
      )
        throw new Error("Migration tests require a loopback database");
      client = new Client({ connectionString: target.href });
      await client.connect();
    });
    beforeEach(() => {
      schema = validatePostgresSchema(
        `one_gate_tool_tests_${randomUUID().replaceAll("-", "").slice(0, 12)}`
      );
    });
    afterEach(async () => {
      vi.unstubAllEnvs();
      await client.query("ROLLBACK");
      // Only this test's freshly generated, validated schema is eligible for teardown.
      if (!/^one_gate_tool_tests_[a-f0-9]{12}$/.test(schema))
        throw new Error("Unexpected migration test schema");
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    });
    afterAll(async () => {
      await client?.end();
    });
    async function enter() {
      await client.query(`SET search_path TO "${schema}", pg_catalog`);
    }
    async function installLegacySchema() {
      await client.query("BEGIN");
      try {
        await client.query(`CREATE SCHEMA "${schema}"`);
        await client.query(`SET LOCAL search_path TO "${schema}", pg_catalog`);
        await client.query(postgresMigrationSql);
        await client.query(`CREATE TABLE _one_gate_pg_migrations (
          id text PRIMARY KEY NOT NULL, checksum text NOT NULL,
          contract_checksum text NOT NULL, applied_time_utc bigint NOT NULL
        )`);
        const fingerprint = await postgresCatalogFingerprint(client, schema);
        await client.query(
          "INSERT INTO _one_gate_pg_migrations VALUES($1,$2,$3,$4)",
          [postgresMigrationId, postgresMigrationChecksum, fingerprint, 1000]
        );
        await client.query("COMMIT");
      } catch (error: unknown) {
        await client.query("ROLLBACK");
        throw error;
      }
      await enter();
    }
    async function counts() {
      await enter();
      const { rows } = await client.query<{
        roles: string;
        users: string;
        menus: string;
        permissions: string;
        bindings: string;
      }>(`SELECT
      (SELECT count(*)::text FROM system_role) AS roles,
      (SELECT count(*)::text FROM "system_user") AS users,
      (SELECT count(*)::text FROM system_menu) AS menus,
      (SELECT count(*)::text FROM system_permission) AS permissions,
      (SELECT count(*)::text FROM system_role_permission) AS bindings`);
      return rows[0];
    }
    it("requires explicit schema and flags and rejects public or arbitrary schema names", () => {
      vi.stubEnv("PG_SCHEMA", "");
      expect(() => postgresToolOptions([])).toThrow();
      for (const invalid of [
        "public",
        "auth",
        'one_gate";DROP SCHEMA public;--',
        "one_gate_validation\n",
        `one_gate_${"x".repeat(64)}`,
      ])
        expect(() => postgresToolOptions([`--schema=${invalid}`])).toThrow();
      expect(postgresToolOptions([`--schema=${schema}`])).toEqual({
        schema,
        apply: false,
      });
      expect(() =>
        postgresToolOptions([`--schema=${schema}`, "--apply", "--apply"])
      ).toThrow();
      expect(() =>
        postgresToolOptions([`--schema=${schema}`, "--force"])
      ).toThrow();
    });
    it("does not create a schema during the default check and records an atomic, idempotent apply", async () => {
      expect(await migratePostgres(client, { schema })).toBe("pending");
      expect(
        (
          await client.query(
            "SELECT count(*)::text AS n FROM pg_namespace WHERE nspname=$1",
            [schema]
          )
        ).rows[0].n
      ).toBe("0");
      expect(await migratePostgres(client, { schema, apply: true })).toBe(
        "applied"
      );
      expect(await migratePostgres(client, { schema })).toBe("already_applied");
      expect(await migratePostgres(client, { schema, apply: true })).toBe(
        "already_applied"
      );
      await enter();
      expect(
        (
          await client.query(
            "SELECT id,checksum FROM _one_gate_pg_migrations ORDER BY id"
          )
        ).rows
      ).toEqual(
        postgresMigrations.map(({ id, checksum }) => ({ id, checksum }))
      );
      expect(await counts()).toEqual({
        roles: "0",
        users: "0",
        menus: "0",
        permissions: "0",
        bindings: "0",
      });
    });
    it("upgrades the original 0001 ledger only after checking its recorded fingerprint", async () => {
      await installLegacySchema();
      const prior = (
        await client.query("SELECT * FROM _one_gate_pg_migrations ORDER BY id")
      ).rows[0];
      await client.query(
        "INSERT INTO base_sys_config(namespace,config_key,is_enabled,is_primary,config_value,creator_id,create_time_utc) VALUES('synthetic','retained',TRUE,TRUE,'{}',1,1)"
      );
      expect(await migratePostgres(client, { schema })).toBe("pending");
      await enter();
      expect(
        (
          await client.query(
            "SELECT to_regclass('cloudflare_usage_sync') AS name"
          )
        ).rows[0].name
      ).toBeNull();
      expect(await migratePostgres(client, { schema, apply: true })).toBe(
        "applied"
      );
      expect(await migratePostgres(client, { schema, apply: true })).toBe(
        "already_applied"
      );
      await enter();
      const markers = (
        await client.query("SELECT * FROM _one_gate_pg_migrations ORDER BY id")
      ).rows;
      expect(markers).toHaveLength(2);
      expect(markers[0]).toEqual(prior);
      expect(markers[1]).toMatchObject({
        id: "0002_cloudflare_usage",
        checksum: postgresMigrations[1].checksum,
      });
      expect(
        (
          await client.query(
            "SELECT config_key FROM base_sys_config WHERE namespace='synthetic'"
          )
        ).rows
      ).toEqual([{ config_key: "retained" }]);
      expect(
        (
          await client.query(
            "SELECT count(*)::text AS n FROM cloudflare_usage_sync"
          )
        ).rows[0].n
      ).toBe("0");
    });
    it("serializes concurrent installers without duplicate migration markers", async () => {
      const peer = new Client({
        connectionString: process.env.ONE_GATE_TEST_POSTGRES_URL,
      });
      await peer.connect();
      try {
        const statuses = await Promise.all([
          migratePostgres(client, { schema, apply: true }),
          migratePostgres(peer, { schema, apply: true }),
        ]);
        expect(statuses.sort()).toEqual(["already_applied", "applied"]);
        await enter();
        expect(
          (
            await client.query(
              "SELECT id FROM _one_gate_pg_migrations ORDER BY id"
            )
          ).rows
        ).toEqual(postgresMigrations.map(({ id }) => ({ id })));
      } finally {
        await peer.end();
      }
    });
    it("rejects drift in a 0001-only schema before creating any 0002 table or marker", async () => {
      await installLegacySchema();
      await client.query(
        "ALTER TABLE system_department DROP CONSTRAINT system_department_soft_delete_state_check"
      );
      await expect(migratePostgres(client, { schema })).rejects.toThrow(
        "fingerprint mismatch"
      );
      await expect(
        migratePostgres(client, { schema, apply: true })
      ).rejects.toThrow("fingerprint mismatch");
      await enter();
      expect(
        (await client.query("SELECT id FROM _one_gate_pg_migrations")).rows
      ).toEqual([{ id: postgresMigrationId }]);
      expect(
        (
          await client.query(
            "SELECT to_regclass('cloudflare_usage_snapshot') AS name"
          )
        ).rows[0].name
      ).toBeNull();
    });
    it("rolls back the whole fresh installation when 0002 fails after 0001", async () => {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await enter();
      await client.query(
        "CREATE VIEW cloudflare_usage_sync AS SELECT 7 AS synthetic"
      );
      await expect(
        migratePostgres(client, { schema, apply: true })
      ).rejects.toThrow();
      const tables = await client.query(
        "SELECT count(*)::text AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='r'",
        [schema]
      );
      expect(tables.rows[0].n).toBe("0");
      expect(
        (await client.query("SELECT synthetic FROM cloudflare_usage_sync"))
          .rows[0].synthetic
      ).toBe(7);
    });
    it("rolls back a failed 0002 upgrade while preserving the original schema and ledger", async () => {
      await installLegacySchema();
      const prior = (
        await client.query("SELECT * FROM _one_gate_pg_migrations")
      ).rows;
      await client.query(
        "CREATE VIEW cloudflare_usage_sync AS SELECT 7 AS synthetic"
      );
      await expect(
        migratePostgres(client, { schema, apply: true })
      ).rejects.toThrow();
      await enter();
      expect(
        (await client.query("SELECT * FROM _one_gate_pg_migrations")).rows
      ).toEqual(prior);
      expect(
        (
          await client.query(
            "SELECT to_regclass('cloudflare_usage_daily') AS name"
          )
        ).rows[0].name
      ).toBeNull();
      expect(
        (
          await client.query(
            "SELECT to_regclass('cloudflare_usage_snapshot') AS name"
          )
        ).rows[0].name
      ).toBeNull();
      expect(
        (await client.query("SELECT synthetic FROM cloudflare_usage_sync"))
          .rows[0].synthetic
      ).toBe(7);
      await client.query("DROP VIEW cloudflare_usage_sync");
      expect(await migratePostgres(client, { schema, apply: true })).toBe(
        "applied"
      );
    });
    it.each(["unknown", "missing-first"])(
      "rejects an unknown or discontinuous migration ledger: %s",
      async (kind) => {
        await migratePostgres(client, { schema, apply: true });
        await enter();
        if (kind === "unknown") {
          await client.query(
            "INSERT INTO _one_gate_pg_migrations VALUES('9999_unknown','synthetic','synthetic',1)"
          );
        } else {
          await client.query(
            "DELETE FROM _one_gate_pg_migrations WHERE id=$1",
            [postgresMigrationId]
          );
        }
        await expect(
          migratePostgres(client, { schema, apply: true })
        ).rejects.toThrow("ordered known prefix");
      }
    );
    it("refuses unmarked existing tables and preserves their contents", async () => {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await enter();
      await client.query(
        "CREATE TABLE retained_synthetic_record(id integer PRIMARY KEY, note text)"
      );
      await client.query(
        "INSERT INTO retained_synthetic_record VALUES(7,'synthetic retained')"
      );
      await expect(
        migratePostgres(client, { schema, apply: true })
      ).rejects.toThrow("unmarked existing tables");
      expect(
        (await client.query("SELECT id,note FROM retained_synthetic_record"))
          .rows
      ).toEqual([{ id: 7, note: "synthetic retained" }]);
      expect(
        (
          await client.query(
            "SELECT to_regclass('_one_gate_pg_migrations') AS ledger"
          )
        ).rows[0].ledger
      ).toBeNull();
    });
    it("rolls back partially executed DDL and its success marker after a name collision", async () => {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await enter();
      await client.query('CREATE VIEW "system_user" AS SELECT 7 AS synthetic');
      await expect(
        migratePostgres(client, { schema, apply: true })
      ).rejects.toThrow();
      const tables = await client.query(
        "SELECT count(*)::text AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='r'",
        [schema]
      );
      expect(tables.rows[0].n).toBe("0");
      expect(
        (await client.query('SELECT synthetic FROM "system_user"')).rows[0]
          .synthetic
      ).toBe(7);
      await client.query('DROP VIEW "system_user"');
      expect(await migratePostgres(client, { schema, apply: true })).toBe(
        "applied"
      );
    });
    it("rejects altered checksums without replacing the migration ledger", async () => {
      await migratePostgres(client, { schema, apply: true });
      await enter();
      await client.query(
        "UPDATE _one_gate_pg_migrations SET checksum='synthetic-changed-checksum'"
      );
      await expect(migratePostgres(client, { schema })).rejects.toThrow(
        "checksum mismatch"
      );
      await expect(
        migratePostgres(client, { schema, apply: true })
      ).rejects.toThrow("checksum mismatch");
      expect(
        (await client.query("SELECT checksum FROM _one_gate_pg_migrations"))
          .rows[0].checksum
      ).toBe("synthetic-changed-checksum");
    });
    it("detects dropped constraints even when table and column names still match", async () => {
      await migratePostgres(client, { schema, apply: true });
      await enter();
      await client.query(
        "ALTER TABLE system_department DROP CONSTRAINT system_department_soft_delete_state_check"
      );
      await expect(migratePostgres(client, { schema })).rejects.toThrow(
        "fingerprint mismatch"
      );
      await expect(
        seedPostgres(client, { schema, apply: true })
      ).rejects.toThrow("fingerprint mismatch");
    });
    it("keeps default seed checks read-only and never silently creates an administrator", async () => {
      await migratePostgres(client, { schema, apply: true });
      expect((await seedPostgres(client, { schema })).status).toBe("pending");
      expect(await counts()).toEqual({
        roles: "0",
        users: "0",
        menus: "0",
        permissions: "0",
        bindings: "0",
      });
      expect((await seedPostgres(client, { schema, apply: true })).status).toBe(
        "pending_admin"
      );
      const seeded = await counts();
      expect(seeded).toEqual({
        roles: "1",
        users: "0",
        menus: String(postgresMenuSeeds().length),
        permissions: String(postgresPermissionSeeds().length),
        bindings: String(postgresPermissionSeeds().length),
      });
      await enter();
      const commonErrors = await client.query<{
        t_key: string;
        languages: string[];
      }>(
        `SELECT t_key,array_agg(lang_code ORDER BY lang_code) AS languages
        FROM i18n_translation WHERE t_key=ANY($1::text[]) GROUP BY t_key ORDER BY t_key`,
        [
          [
            "errorHandler.notFound",
            "errorHandler.permissionDenied",
            "errorHandler.totpGateRequired",
          ],
        ]
      );
      expect(commonErrors.rows).toEqual([
        { t_key: "errorHandler.notFound", languages: ["en-US", "zh-CN"] },
        {
          t_key: "errorHandler.permissionDenied",
          languages: ["en-US", "zh-CN"],
        },
        {
          t_key: "errorHandler.totpGateRequired",
          languages: ["en-US", "zh-CN"],
        },
      ]);
      expect((await seedPostgres(client, { schema, apply: true })).status).toBe(
        "pending_admin"
      );
      expect(await counts()).toEqual(seeded);
    });
    it("rolls back failed bootstrap metadata and supports an explicit administrator retry", async () => {
      await migratePostgres(client, { schema, apply: true });
      await expect(
        seedPostgres(client, {
          schema,
          apply: true,
          admin: { username: "synthetic-admin", password: "short" },
        })
      ).rejects.toThrow("at least 12");
      expect(await counts()).toEqual({
        roles: "0",
        users: "0",
        menus: "0",
        permissions: "0",
        bindings: "0",
      });
      const password = `synthetic-${randomUUID()}`;
      expect(
        (
          await seedPostgres(client, {
            schema,
            apply: true,
            admin: { username: "synthetic-admin", password },
          })
        ).createdAdmin
      ).toBe(true);
      await enter();
      const { rows } = await client.query<{
        password: string;
        role_id_arr: number[];
      }>(`SELECT password,role_id_arr FROM "system_user" WHERE id=1`);
      expect(rows[0].password).not.toBe(password);
      expect(await verifyPassword(password, rows[0].password)).toBe(true);
      expect(rows[0].role_id_arr).toEqual([1]);
      expect((await seedPostgres(client, { schema })).status).toBe("current");
    });
    it("preserves existing credentials, disabled accounts, disabled permissions and edited copy", async () => {
      await migratePostgres(client, { schema, apply: true });
      await seedPostgres(client, {
        schema,
        apply: true,
        admin: {
          username: "synthetic-admin",
          password: `synthetic-${randomUUID()}`,
        },
      });
      await enter();
      await client.query(
        `UPDATE "system_user" SET password='synthetic-existing-hash',is_enabled=FALSE WHERE id=1`
      );
      await client.query(
        "UPDATE system_permission SET is_enabled=FALSE WHERE id=(SELECT MIN(id) FROM system_permission)"
      );
      const menuId = postgresMenuSeeds()[0].id;
      await client.query(
        "UPDATE system_menu SET name='synthetic-custom-label',is_enabled=FALSE WHERE id=$1",
        [menuId]
      );
      await client.query(
        "UPDATE i18n_translation SET t_value='synthetic-custom-copy' WHERE id=(SELECT MIN(id) FROM i18n_translation)"
      );
      await client.query(
        "DELETE FROM system_role_permission WHERE id=(SELECT MIN(id) FROM system_role_permission)"
      );
      await seedPostgres(client, {
        schema,
        apply: true,
        admin: {
          username: "synthetic-admin",
          password: `synthetic-${randomUUID()}`,
        },
      });
      expect(
        (
          await client.query(
            'SELECT password,is_enabled FROM "system_user" WHERE id=1'
          )
        ).rows[0]
      ).toEqual({ password: "synthetic-existing-hash", is_enabled: false });
      expect(
        (
          await client.query(
            "SELECT is_enabled FROM system_permission ORDER BY id LIMIT 1"
          )
        ).rows[0].is_enabled
      ).toBe(false);
      expect(
        (
          await client.query(
            "SELECT name,is_enabled FROM system_menu WHERE id=$1",
            [menuId]
          )
        ).rows[0]
      ).toEqual({ name: "synthetic-custom-label", is_enabled: false });
      expect(
        (
          await client.query(
            "SELECT t_value FROM i18n_translation ORDER BY id LIMIT 1"
          )
        ).rows[0].t_value
      ).toBe("synthetic-custom-copy");
    });
    it("refuses disabled platform roles and seed-menu ID collisions without resetting them", async () => {
      await migratePostgres(client, { schema, apply: true });
      await seedPostgres(client, { schema, apply: true });
      await enter();
      await client.query("UPDATE system_role SET is_enabled=FALSE WHERE id=1");
      await expect(
        seedPostgres(client, { schema, apply: true })
      ).rejects.toThrow("manual review");
      expect(
        (await client.query("SELECT is_enabled FROM system_role WHERE id=1"))
          .rows[0].is_enabled
      ).toBe(false);
      await client.query("UPDATE system_role SET is_enabled=TRUE WHERE id=1");
      const menuId = postgresMenuSeeds()[0].id;
      await client.query(
        "UPDATE system_menu SET path='/synthetic-collision' WHERE id=$1",
        [menuId]
      );
      await expect(
        seedPostgres(client, { schema, apply: true })
      ).rejects.toThrow("ID collision");
      expect(
        (
          await client.query("SELECT path FROM system_menu WHERE id=$1", [
            menuId,
          ])
        ).rows[0].path
      ).toBe("/synthetic-collision");
    });
    it("raises seeded identities above preserved sequence high-water marks", async () => {
      await migratePostgres(client, { schema, apply: true });
      await enter();
      await client.query(
        "SELECT setval(pg_get_serial_sequence('system_menu','id'),900000,TRUE)"
      );
      await seedPostgres(client, { schema, apply: true });
      expect(
        (await client.query("SELECT last_value::text FROM system_menu_id_seq"))
          .rows[0].last_value
      ).toBe("900000");
      const { rows } = await client.query(
        "INSERT INTO system_menu(name,icon,sort,business,is_enabled,creator_id,create_time_utc) VALUES('synthetic-next','synthetic-icon',1,'synthetic',TRUE,1,1) RETURNING id::text"
      );
      expect(rows[0].id).toBe("900001");
    });
  }
);
