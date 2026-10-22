import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import type { UserObj } from "@hodor/core/types/app";
import { getPostgresError } from "@hodor/core/db/postgresql/errors";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../apps/server/test/postgresql";
import {
  onAdd as addSystem,
  onUpdate as updateSystem,
} from "./sys_config/service";
import {
  onAdd as addPersonal,
  onUpdate as updatePersonal,
} from "@hodor/personal/base/user_config/service";

vi.mock("@hodor/admin/common/registry", () => ({ registry: {} }));

const user: UserObj = {
  principal: { kind: "user", userId: 11 },
  id: 11,
  userId: 11,
  username: "synthetic-config-user",
  langCode: "en-US",
  isEnabled: true,
  token: "synthetic-token",
  isSuperAdmin: false,
  roleIds: [],
  permissions: [],
  dataScope: "self_only",
  customDeptIds: [],
  ensureLoaded: async () => undefined,
};
const config = (configKey: string) => ({
  namespace: "synthetic",
  configKey,
  isEnabled: true,
  isPrimary: true,
  configValue: { synthetic: true },
});

describe.skipIf(!postgresTestsConfigured)(
  "real PostgreSQL configuration transactions",
  () => {
    let harness: PostgresTestHarness;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("config_tests");
      // Fixture-only constraints and triggers force failures after primary flags change.
      await harness.query(
        sql`CREATE UNIQUE INDEX synthetic_system_config_unique ON base_sys_config(namespace, config_key);
      CREATE UNIQUE INDEX synthetic_personal_config_unique ON base_user_config(user_id, namespace, config_key);
      CREATE FUNCTION reject_synthetic_config_write() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.config_key = 'skip' THEN
          RETURN NULL;
        END IF;
        IF NEW.config_key = 'reject' THEN
          RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Synthetic configuration failure';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_synthetic_system_config BEFORE INSERT OR UPDATE ON base_sys_config
        FOR EACH ROW EXECUTE FUNCTION reject_synthetic_config_write();
      CREATE TRIGGER reject_synthetic_personal_config BEFORE INSERT OR UPDATE ON base_user_config
        FOR EACH ROW EXECUTE FUNCTION reject_synthetic_config_write()`,
        true
      );
    });
    afterAll(async () => {
      await harness?.close();
    });
    beforeEach(async () => {
      await harness.reset();
      for (const kind of ["system", "personal"] as const) {
        const table = sql.identifier(
          kind === "system" ? "base_sys_config" : "base_user_config"
        );
        await harness.query(
          sql`INSERT INTO ${table}(id,namespace,config_key,is_enabled,is_primary,config_value,creator_id,create_time_utc${kind === "personal" ? sql`,user_id` : sql``})
        VALUES (1,'synthetic','original',TRUE,TRUE,'{"saved":1}'::jsonb,11,1${kind === "personal" ? sql`,11` : sql``}),
          (2,'synthetic','candidate',TRUE,FALSE,'{"saved":2}'::jsonb,11,1${kind === "personal" ? sql`,11` : sql``})`,
          true
        );
        await harness.query(
          sql`SELECT setval(pg_get_serial_sequence(${kind === "system" ? "base_sys_config" : "base_user_config"},'id'), 2, TRUE)`,
          true
        );
      }
    });
    function snapshot(kind: "system" | "personal") {
      const table = sql.identifier(
        kind === "system" ? "base_sys_config" : "base_user_config"
      );
      return harness.query(
        sql`SELECT config_key, is_primary, config_value, update_time_utc FROM ${table} ORDER BY id`
      );
    }
    async function expectRollback(
      kind: "system" | "personal",
      operation: () => Promise<unknown>,
      code: string
    ) {
      const previous = await snapshot(kind);
      const result = await harness.run(operation).then(
        () => undefined,
        (error: unknown) =>
          error instanceof BusinessError
            ? error.code
            : getPostgresError(error)?.code
      );
      expect(result).toBe(code);
      expect(await snapshot(kind)).toEqual(previous);
    }

    it("rolls back the old system primary on an insert uniqueness failure", () =>
      expectRollback(
        "system",
        () => addSystem(config("original"), user),
        "23505"
      ));
    it("rolls back system primary flags and values when the update conflicts", () =>
      expectRollback(
        "system",
        () =>
          updateSystem({ id: 2, configKey: "original", isPrimary: true }, user),
        "23505"
      ));
    it("rolls back system primary flags when the second statement fails", () =>
      expectRollback(
        "system",
        () =>
          updateSystem({ id: 2, configKey: "reject", isPrimary: true }, user),
        "P0001"
      ));
    it("rolls back the old personal primary when the insert fails", () =>
      expectRollback(
        "personal",
        () => addPersonal(config("reject"), user),
        "P0001"
      ));
    it("rolls back personal primary flags and values when the update conflicts", () =>
      expectRollback(
        "personal",
        () =>
          updatePersonal(
            { id: 2, configKey: "original", isPrimary: true },
            user
          ),
        "23505"
      ));
    it("rolls back personal primary flags when the second statement fails", () =>
      expectRollback(
        "personal",
        () =>
          updatePersonal({ id: 2, configKey: "reject", isPrimary: true }, user),
        "P0001"
      ));
    it("rejects a zero-row system insert and restores the primary flag", () =>
      expectRollback(
        "system",
        () => addSystem(config("skip"), user),
        BusinessErrorCode.NOT_EXIST_OR_DISABLED
      ));
    it("rejects a zero-row system update and restores the primary flag", () =>
      expectRollback(
        "system",
        () => updateSystem({ id: 2, configKey: "skip", isPrimary: true }, user),
        BusinessErrorCode.NOT_EXIST_OR_DISABLED
      ));
    it("rejects a zero-row personal update and restores the primary flag", () =>
      expectRollback(
        "personal",
        () =>
          updatePersonal({ id: 2, configKey: "skip", isPrimary: true }, user),
        BusinessErrorCode.NOT_EXIST_OR_DISABLED
      ));
    for (const kind of ["system", "personal"] as const) {
      it(`serializes concurrent ${kind} primary promotions without clearing both`, async () => {
        const add = kind === "system" ? addSystem : addPersonal;
        const results = await Promise.all([
          harness.run(() => add(config("first"), user)),
          harness.run(() => add(config("second"), user)),
        ]);
        expect(new Set(results).size).toBe(2);
        const rows = await snapshot(kind);
        expect(rows).toHaveLength(4);
        expect(rows.filter((row) => row.is_primary === true)).toHaveLength(1);
        expect(["first", "second"]).toContain(
          rows.filter((row) => row.is_primary === true)[0].config_key
        );
      });
    }
  }
);
