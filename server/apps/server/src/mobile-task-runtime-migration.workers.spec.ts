import { env, reset } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import deviceSql from "@hodor/core/db/sql/admin/admin_mobile_device.sql?raw";
import migrationSql from "../d1-migrations/0022_mobile_task_runtime.sql?raw";
import contractSql from "../d1-contract/mobile-task-runtime.sql?raw";
import workerContractSql from "../d1-contract/worker-schema.sql?raw";
import {
  existingBusinessSql,
  sqlStatements,
} from "../test/fixtures/enterprise-assets-migration";

async function execute(sql: string): Promise<void> {
  await env.DB.batch(
    sqlStatements(sql).map((statement) => env.DB.prepare(statement))
  );
}
beforeEach(async () => {
  await reset();
  await execute(deviceSql + existingBusinessSql);
  await env.DB.prepare(
    "INSERT INTO admin_mobile_device(id,client_id,is_enabled,creator_id) VALUES(1,'test-device',1,1)"
  ).run();
});

describe("mobile-task-runtime migration on isolated D1", () => {
  it("preserves records and sequence while adding the exact empty table, including on repeat", async () => {
    const devices = (
      await env.DB.prepare("SELECT * FROM admin_mobile_device").all()
    ).results;
    const sequence = (
      await env.DB.prepare("SELECT * FROM sqlite_sequence ORDER BY name").all()
    ).results;
    await execute(migrationSql);
    await execute(migrationSql);
    await execute(contractSql);
    expect(
      (await env.DB.prepare("SELECT * FROM admin_mobile_device").all()).results
    ).toEqual(devices);
    expect(
      (
        await env.DB.prepare(
          "SELECT * FROM sqlite_sequence ORDER BY name"
        ).all()
      ).results
    ).toEqual(sequence);
    expect(
      (await env.DB.prepare("SELECT * FROM admin_mobile_task_runtime").all())
        .results
    ).toEqual([]);
    expect(
      workerContractSql.match(
        /-- mobile-task-runtime-contract-start\s*([\s\S]*?)\s*-- mobile-task-runtime-contract-end/
      )?.[1]
    ).toBe(contractSql.trim());
  });

  it("rejects an orphan snapshot and cascades only the deleted device snapshot", async () => {
    await execute(migrationSql);
    const insert =
      "INSERT INTO admin_mobile_task_runtime VALUES(?,'session',1,1,1,1,'{}')";
    await expect(
      env.DB.prepare(insert).bind("unknown-device").run()
    ).rejects.toThrow();
    await env.DB.prepare(insert).bind("test-device").run();
    await env.DB.prepare(
      "DELETE FROM admin_mobile_device WHERE client_id='test-device'"
    ).run();
    expect(
      (await env.DB.prepare("SELECT * FROM admin_mobile_task_runtime").all())
        .results
    ).toEqual([]);
    expect(
      await env.DB.prepare("SELECT value FROM existing_business").first("value")
    ).toBe("unchanged");
  });

  it("rejects an incompatible parent and rolls back the entire batch", async () => {
    await env.DB.prepare("DROP TABLE admin_mobile_device").run();
    await env.DB.prepare(
      "CREATE TABLE admin_mobile_device(client_id TEXT)"
    ).run();
    await expect(execute(migrationSql)).rejects.toThrow();
    expect(
      await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE name='admin_mobile_task_runtime'"
      ).first("name")
    ).toBeNull();
    expect(
      await env.DB.prepare("SELECT value FROM existing_business").first("value")
    ).toBe("unchanged");
  });

  it("rejects unexpected triggers instead of silently accepting schema drift", async () => {
    await execute(migrationSql);
    await env.DB.prepare(
      "CREATE TRIGGER unexpected_runtime_trigger AFTER INSERT ON admin_mobile_task_runtime BEGIN SELECT 1; END;"
    ).run();
    await expect(execute(contractSql)).rejects.toThrow();
  });
});
