import { createClient, type Client } from "@libsql/client";
import { execFile } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  AssetPreflightError,
  assetMetadataContractSql,
  createWranglerAssetTransport,
  inspectEnterpriseAssetRelease,
  loadAssetPreflightTarget,
  parseAssetPreflightArgs,
  parseWranglerMetadata,
  type AssetPreflightTransport,
  type WranglerInvocation,
} from "../scripts/preflight-enterprise-assets";
import {
  enterpriseAssetsMetadataSql,
  enterpriseAssetsMigrationSql,
} from "../scripts/migrate-enterprise-assets";
import {
  existingBusinessSql,
  existingMetadataSql,
} from "../test/fixtures/enterprise-assets-migration";

const clients: Client[] = [];
const directories: string[] = [];
function directory() {
  const created = mkdtempSync(join(tmpdir(), "one-gate-assets-preflight-"));
  directories.push(created);
  return created;
}
function configFile(value: unknown, filename = "wrangler private.jsonc") {
  const path = join(directory(), filename);
  writeFileSync(path, JSON.stringify(value), "utf8");
  return path;
}
const databaseId = "11111111-1111-4111-8111-111111111111";
const config = {
  name: "asset-release-test",
  compatibility_date: "2026-10-22",
  d1_databases: [
    {
      binding: "DB",
      database_name: "asset-release-test",
      database_id: databaseId,
    },
  ],
  vars: { PRIVATE_VALUE: "SYNTHETIC_VALUE_MUST_NOT_BE_REPORTED" },
};
const parentMenuSql =
  "INSERT INTO system_menu(id,name,icon,sort,business,is_enabled,creator_id,create_time_utc) VALUES(26,'Enterprise','domain',4,'enterprise',1,1,100);";
async function database(ready = true) {
  const client = createClient({ url: ":memory:" });
  clients.push(client);
  if (ready) {
    await client.executeMultiple(existingBusinessSql);
    await client.executeMultiple(existingMetadataSql);
    await client.execute(parentMenuSql);
    await client.executeMultiple(enterpriseAssetsMigrationSql);
    await client.executeMultiple(enterpriseAssetsMetadataSql);
    await client.executeMultiple(`CREATE TABLE d1_migrations (name TEXT NOT NULL UNIQUE);
      INSERT INTO d1_migrations(name) VALUES ('0016_enterprise_assets.sql'),('0017_enterprise_asset_metadata.sql');`);
  }
  const sql: string[] = [];
  const query: AssetPreflightTransport = async (statement) => {
    sql.push(statement);
    return (await client.execute(statement)).rows.map((row) => ({ ...row }));
  };
  return { client, query, sql };
}
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const path of directories.splice(0)) {
    const absolute = resolve(path);
    if (
      dirname(absolute) !== resolve(tmpdir()) ||
      !basename(absolute).startsWith("one-gate-assets-preflight-")
    )
      throw new Error("Refusing cleanup outside the test directory");
    rmSync(absolute, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
});

describe("explicit read-only enterprise release target", () => {
  it("requires an absolute named config and exactly one target", () => {
    const path = configFile(config);
    expect(parseAssetPreflightArgs(["--config", path, "--local"])).toEqual({
      configPath: path,
      mode: "local",
    });
    expect(loadAssetPreflightTarget([`--config=${path}`, "--remote"])).toEqual({
      configPath: path,
      mode: "remote",
      databaseName: "asset-release-test",
    });
    for (const args of [
      [],
      ["--config", path],
      ["--local"],
      ["--config=relative.jsonc", "--remote"],
      ["--config", path, "--local", "--remote"],
      ["--config", path, "--local", "--local"],
    ])
      expect(() => parseAssetPreflightArgs(args)).toThrow(AssetPreflightError);
  });
  it("rejects ambiguous, unknown and write-related arguments", () => {
    const path = configFile(config);
    for (const extra of [
      "--write",
      "--reset",
      "--yes",
      "--database=elsewhere",
      "--env=production",
      "--command=DELETE FROM system_menu",
    ])
      expect(() =>
        loadAssetPreflightTarget(["--config", path, "--local", extra])
      ).toThrow("UNKNOWN_ARGUMENT");
    expect(() =>
      parseAssetPreflightArgs(["--config", path, `--config=${path}`, "--local"])
    ).toThrow("CONFIG_ARGUMENT_INVALID");
    expect(() => parseAssetPreflightArgs(["--config", "--local"])).toThrow(
      "CONFIG_ARGUMENT_INVALID"
    );
  });
  it("accepts JSONC comments without exposing config vars", () => {
    const path = configFile(config);
    writeFileSync(
      path,
      `// private config\n${JSON.stringify(config).replace(/}$/, ",}")}`,
      "utf8"
    );
    expect(
      JSON.stringify(loadAssetPreflightTarget(["--config", path, "--local"]))
    ).not.toContain(config.vars.PRIVATE_VALUE);
  });
  it("refuses the public all-zero template in either mode", () => {
    const path = configFile({
      ...config,
      d1_databases: [
        {
          ...config.d1_databases[0],
          database_id: "00000000-0000-0000-0000-000000000000",
        },
      ],
    });
    for (const mode of ["--local", "--remote"])
      expect(() => loadAssetPreflightTarget(["--config", path, mode])).toThrow(
        "DATABASE_TARGET_INVALID"
      );
  });
  it("refuses missing, duplicate, invalid and unsupported bindings", () => {
    for (const value of [
      {},
      { d1_databases: [] },
      { d1_databases: [config.d1_databases[0], config.d1_databases[0]] },
      { d1_databases: [{ ...config.d1_databases[0], binding: "OTHER" }] },
    ]) {
      const path = configFile(value);
      expect(() =>
        loadAssetPreflightTarget(["--config", path, "--local"])
      ).toThrow("DATABASE_BINDING_REQUIRED");
    }
    const unsupported = configFile({
      ...config,
      d1_databases: [
        { ...config.d1_databases[0], migrations_table: "custom_ledger" },
      ],
    });
    expect(() =>
      loadAssetPreflightTarget(["--config", unsupported, "--local"])
    ).toThrow("MIGRATION_LEDGER_UNSUPPORTED");
    const invalid = configFile({
      ...config,
      d1_databases: [
        { ...config.d1_databases[0], database_id: "not-a-target" },
      ],
    });
    expect(() =>
      loadAssetPreflightTarget(["--config", invalid, "--local"])
    ).toThrow("DATABASE_TARGET_INVALID");
  });
  it("refuses unsupported, missing, directory and malformed configs", () => {
    const toml = configFile(config, "wrangler.toml");
    expect(() =>
      loadAssetPreflightTarget(["--config", toml, "--local"])
    ).toThrow("JSON_CONFIG_REQUIRED");
    const missing = join(directory(), "missing.jsonc");
    expect(() =>
      loadAssetPreflightTarget(["--config", missing, "--local"])
    ).toThrow("CONFIG_FILE_INVALID");
    const folder = join(directory(), "directory.jsonc");
    mkdirSync(folder);
    expect(() =>
      loadAssetPreflightTarget(["--config", folder, "--local"])
    ).toThrow("CONFIG_FILE_INVALID");
    const malformed = configFile(config);
    writeFileSync(malformed, "{ not valid json", "utf8");
    expect(() =>
      loadAssetPreflightTarget(["--config", malformed, "--local"])
    ).toThrow("CONFIG_JSON_INVALID");
  });
});

describe("Wrangler read-only transport", () => {
  it("uses the installed Node CLI without a shell or implicit remote mode", async () => {
    const invocations: WranglerInvocation[] = [];
    const target = loadAssetPreflightTarget([
      "--config",
      configFile(config),
      "--local",
    ]);
    const transport = createWranglerAssetTransport(
      target,
      async (invocation) => {
        invocations.push(invocation);
        return JSON.stringify([
          {
            success: true,
            results: [{ check_key: "menu:108", code: "READY" }],
          },
        ]);
      }
    );
    await expect(transport(assetMetadataContractSql)).resolves.toEqual([
      { check_key: "menu:108", code: "READY" },
    ]);
    expect(invocations).toHaveLength(1);
    expect(invocations[0].program).toBe(process.execPath);
    expect(invocations[0].args.slice(1, 4)).toEqual(["d1", "execute", "DB"]);
    expect(invocations[0].args).toContain("--local");
    expect(invocations[0].args).not.toContain("--remote");
    expect(invocations[0].args).toContain(target.configPath);
    expect(invocations[0].options).toMatchObject({
      shell: false,
      windowsHide: true,
      cwd: dirname(target.configPath),
    });
    await expect(transport("SELECT * FROM enterprise_asset")).rejects.toThrow(
      "QUERY_NOT_ALLOWED"
    );
    await expect(transport("DELETE FROM system_menu")).rejects.toThrow(
      "QUERY_NOT_ALLOWED"
    );
    expect(invocations).toHaveLength(1);
  });
  it("sets remote only when explicitly selected", async () => {
    const target = loadAssetPreflightTarget([
      "--config",
      configFile(config),
      "--remote",
    ]);
    const transport = createWranglerAssetTransport(
      target,
      async (invocation) => {
        expect(invocation.args).toContain("--remote");
        expect(invocation.args).not.toContain("--local");
        return '[{"success":true,"results":[]}]';
      }
    );
    await expect(transport(assetMetadataContractSql)).resolves.toEqual([]);
  });
  it("sanitizes command failures instead of exposing provider output", async () => {
    const target = loadAssetPreflightTarget([
      "--config",
      configFile(config),
      "--local",
    ]);
    const transport = createWranglerAssetTransport(target, async () => {
      throw new Error(config.vars.PRIVATE_VALUE);
    });
    try {
      await transport(assetMetadataContractSql);
      throw new Error("Expected transport failure");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AssetPreflightError);
      expect(String(error)).toContain("WRANGLER_COMMAND_FAILED");
      expect(String(error)).not.toContain(config.vars.PRIVATE_VALUE);
    }
  });
  it("fails closed for malformed or failed Wrangler responses", () => {
    for (const source of [
      "not json",
      "{}",
      "[]",
      '[{"success":false,"results":[]}]',
      '[{"success":true,"results":[null]}]',
      JSON.stringify([
        { success: true, results: Array.from({ length: 101 }, () => ({})) },
      ]),
    ])
      expect(() => parseWranglerMetadata(source)).toThrow(
        "WRANGLER_RESPONSE_INVALID"
      );
    expect(
      parseWranglerMetadata(
        '[{"success":true,"results":[]},{"success":true,"results":[{"name":"example"}]}]'
      )
    ).toEqual([{ name: "example" }]);
  });
});

describe("enterprise release metadata inspection on SQLite", () => {
  it("validates migrations, seven tables, navigation and RBAC without any writes or business reads", async () => {
    const { client, query, sql } = await database();
    const before = await client.execute("SELECT total_changes() AS changes");
    const report = await inspectEnterpriseAssetRelease(query);
    expect(report.ready).toBe(true);
    expect(report.checks).toHaveLength(31);
    expect(report.checks.every((check) => check.code === "READY")).toBe(true);
    expect(
      (await client.execute("SELECT total_changes() AS changes")).rows
    ).toEqual(before.rows);
    expect(sql).toHaveLength(4);
    expect(
      sql.every((statement) => !/\bFROM\s+enterprise_/i.test(statement))
    ).toBe(true);
    expect(
      (await client.execute("SELECT value FROM existing_business WHERE id=7"))
        .rows
    ).toEqual([{ value: "unchanged" }]);
  });
  it("classifies an empty or unmigrated deployment without selecting absent metadata tables", async () => {
    const { query, sql } = await database(false);
    const report = await inspectEnterpriseAssetRelease(query);
    expect(report.ready).toBe(false);
    expect(
      report.checks.filter((check) => check.code === "ASSET_TABLE_MISSING")
    ).toHaveLength(7);
    expect(
      report.checks.some((check) => check.code === "MIGRATION_LEDGER_MISSING")
    ).toBe(true);
    expect(
      report.checks.some((check) => check.code === "METADATA_UNAVAILABLE")
    ).toBe(true);
    expect(sql).toHaveLength(2);
  });
  it("does not guess a successful migration from existing tables alone", async () => {
    const { client, query } = await database();
    await client.execute(
      "DELETE FROM d1_migrations WHERE name='0017_enterprise_asset_metadata.sql'"
    );
    const report = await inspectEnterpriseAssetRelease(query);
    expect(report.ready).toBe(false);
    expect(
      report.checks.find(
        (check) => check.key === "migration:0017_enterprise_asset_metadata.sql"
      )?.code
    ).toBe("MIGRATION_MISSING");
  });
  it("skips metadata evaluation when an existing table has an incompatible shape", async () => {
    const { client, query, sql } = await database();
    await client.execute(
      "ALTER TABLE system_menu RENAME COLUMN path TO incompatible_path"
    );
    const report = await inspectEnterpriseAssetRelease(query);
    expect(
      report.checks.find((check) => check.key === "metadata-schema:system_menu")
        ?.code
    ).toBe("METADATA_SCHEMA_INVALID");
    expect(
      report.checks.find((check) => check.key === "menu:108")?.status
    ).toBe("skipped");
    expect(sql).not.toContain(assetMetadataContractSql);
  });
  it.each([
    {
      mutation: "DELETE FROM system_menu WHERE id=108",
      key: "menu:108",
      code: "MENU_MISSING",
    },
    {
      mutation: "UPDATE system_menu SET path='/custom' WHERE id=108",
      key: "menu:108",
      code: "MENU_CONFLICT",
    },
    {
      mutation: "UPDATE system_menu SET parent_id=NULL WHERE id=109",
      key: "menu:109",
      code: "MENU_CONFLICT",
    },
    {
      mutation: "UPDATE system_menu SET is_enabled=0 WHERE id=109",
      key: "menu:109",
      code: "MENU_DISABLED",
    },
    {
      mutation: "DELETE FROM system_menu WHERE id=26",
      key: "menu:109",
      code: "MENU_PARENT_UNAVAILABLE",
    },
    {
      mutation: "UPDATE system_menu SET is_enabled=0 WHERE id=26",
      key: "menu:108",
      code: "MENU_PARENT_UNAVAILABLE",
    },
    {
      mutation:
        "DELETE FROM system_permission WHERE code='enterprise.asset:add'",
      key: "permission:enterprise.asset:add",
      code: "PERMISSION_MISSING",
    },
    {
      mutation:
        "UPDATE system_permission SET category='custom' WHERE code='enterprise.asset:add'",
      key: "permission:enterprise.asset:add",
      code: "PERMISSION_CONFLICT",
    },
    {
      mutation:
        "UPDATE system_permission SET is_enabled=0 WHERE code='enterprise.asset:read'",
      key: "permission:enterprise.asset:read",
      code: "PERMISSION_DISABLED",
    },
    {
      mutation: "UPDATE system_role SET is_enabled=0 WHERE id=1",
      key: "role:1",
      code: "PLATFORM_ROLE_INACTIVE",
    },
    {
      mutation:
        "UPDATE system_role SET is_deleted=1,deleted_time_utc=100,deleter_id=1 WHERE id=1",
      key: "role:1",
      code: "PLATFORM_ROLE_INACTIVE",
    },
    {
      mutation: "DELETE FROM system_role WHERE id=1",
      key: "role:1",
      code: "PLATFORM_ROLE_MISSING",
    },
    {
      mutation:
        "DELETE FROM system_role_permission WHERE permission_id=(SELECT id FROM system_permission WHERE code='enterprise.asset:edit')",
      key: "grant:enterprise.asset:edit",
      code: "ROLE_GRANT_MISSING",
    },
  ])(
    "reports $code and never repairs operator changes",
    async ({ mutation, key, code }) => {
      const { client, query } = await database();
      await client.execute(mutation);
      const before = await client.execute("SELECT total_changes() AS changes");
      const report = await inspectEnterpriseAssetRelease(query);
      expect(report.ready).toBe(false);
      expect(report.checks.find((check) => check.key === key)?.code).toBe(code);
      expect(
        (await client.execute("SELECT total_changes() AS changes")).rows
      ).toEqual(before.rows);
    }
  );
  it("rejects incomplete or unknown diagnostic rows", async () => {
    const { query } = await database();
    const incomplete: AssetPreflightTransport = async (statement) =>
      statement === assetMetadataContractSql ? [] : query(statement);
    await expect(inspectEnterpriseAssetRelease(incomplete)).rejects.toThrow(
      "METADATA_RESULT_INVALID"
    );
    const unknown: AssetPreflightTransport = async (statement) => {
      const rows = await query(statement);
      return statement === assetMetadataContractSql
        ? rows.map((row) => ({ ...row, code: "UNRECOGNIZED" }))
        : rows;
    };
    await expect(inspectEnterpriseAssetRelease(unknown)).rejects.toThrow(
      "METADATA_RESULT_INVALID"
    );
  });
});

it("executes the real Wrangler transport against an isolated local D1 migration", async () => {
  const path = configFile({
    ...config,
    d1_databases: [
      { ...config.d1_databases[0], migrations_dir: "d1-migrations" },
    ],
  });
  const root = dirname(path);
  const migrations = join(root, "d1-migrations");
  mkdirSync(migrations);
  for (const name of [
    "0016_enterprise_assets.sql",
    "0017_enterprise_asset_metadata.sql",
  ])
    copyFileSync(
      new URL(`../d1-migrations/${name}`, import.meta.url),
      join(migrations, name)
    );
  const foundation = join(root, "foundation.sql");
  writeFileSync(
    foundation,
    existingBusinessSql + existingMetadataSql + parentMenuSql,
    "utf8"
  );
  const require = createRequire(import.meta.url);
  const wranglerEntry = resolve(
    dirname(require.resolve("wrangler/package.json")),
    "bin/wrangler.js"
  );
  const run = promisify(execFile);
  const options = {
    cwd: root,
    encoding: "utf8" as const,
    shell: false as const,
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      CI: "true",
      WRANGLER_SEND_METRICS: "false",
      NO_COLOR: "1",
    },
  };
  await run(
    process.execPath,
    [
      wranglerEntry,
      "d1",
      "execute",
      "DB",
      "--config",
      path,
      "--local",
      "--file",
      foundation,
      "--json",
    ],
    options
  );
  await run(
    process.execPath,
    [
      wranglerEntry,
      "d1",
      "migrations",
      "apply",
      "DB",
      "--config",
      path,
      "--local",
    ],
    options
  );
  const target = loadAssetPreflightTarget(["--config", path, "--local"]);
  const report = await inspectEnterpriseAssetRelease(
    createWranglerAssetTransport(target)
  );
  expect(report.ready).toBe(true);
  expect(report.checks).toHaveLength(31);
  const script = new URL(
    "../scripts/preflight-enterprise-assets.ts",
    import.meta.url
  );
  expect(readFileSync(script, "utf8")).not.toContain("--yes");
}, 90_000);
