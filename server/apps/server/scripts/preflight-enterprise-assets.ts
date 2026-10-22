import { execFile } from "node:child_process";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

export const assetReleaseTables = [
  "enterprise_tenant",
  "enterprise_tenant_member",
  "enterprise_tenant_api_token_grant",
  "enterprise_asset",
  "enterprise_asset_identifier",
  "enterprise_asset_assignment",
  "enterprise_asset_measurement_binding",
] as const;
export const assetReleasePermissions = [
  "enterprise.tenant:read",
  "enterprise.tenant:add",
  "enterprise.tenant:edit",
  "enterprise.asset:read",
  "enterprise.asset:add",
  "enterprise.asset:edit",
  "enterprise.asset.mapping:read",
] as const;
const migrationNames = [
  "0016_enterprise_assets.sql",
  "0017_enterprise_asset_metadata.sql",
] as const;
const metadataColumns = {
  system_menu: ["id", "path", "business", "parent_id", "is_enabled"],
  system_permission: ["id", "code", "business", "category", "is_enabled"],
  system_role_permission: ["role_id", "permission_id"],
  system_role: ["id", "is_enabled", "is_deleted"],
  d1_migrations: ["name"],
} as const;
const metadataTables = Object.keys(metadataColumns);
const discoverySql = `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${[
  ...assetReleaseTables,
  ...metadataTables,
]
  .map((name) => `'${name}'`)
  .join(",")})`;
const columnsSql = metadataTables
  .map(
    (table) =>
      `SELECT '${table}' AS table_name, name AS column_name FROM pragma_table_info('${table}')`
  )
  .join(" UNION ALL ");
const migrationsSql = `SELECT name FROM d1_migrations WHERE name IN (${migrationNames
  .map((name) => `'${name}'`)
  .join(",")})`;
export const assetMetadataContractSql = readFileSync(
  new URL("../d1-contract/enterprise-assets-metadata.sql", import.meta.url),
  "utf8"
);
const allowedQueries = new Set([
  discoverySql,
  columnsSql,
  migrationsSql,
  assetMetadataContractSql,
]);
const metadataChecks = [
  "menu:108",
  "menu:109",
  "role:1",
  ...assetReleasePermissions.map((code) => `permission:${code}`),
  ...assetReleasePermissions.map((code) => `grant:${code}`),
];
const metadataCodes = new Set([
  "READY",
  "MENU_MISSING",
  "MENU_CONFLICT",
  "MENU_DISABLED",
  "MENU_PARENT_UNAVAILABLE",
  "PERMISSION_MISSING",
  "PERMISSION_CONFLICT",
  "PERMISSION_DISABLED",
  "PLATFORM_ROLE_MISSING",
  "PLATFORM_ROLE_INACTIVE",
  "ROLE_GRANT_UNVERIFIABLE",
  "ROLE_GRANT_MISSING",
]);

export class AssetPreflightError extends Error {
  constructor(readonly code: string) {
    // Do not include provider output, config source, environment values or SQL parameters.
    super(code);
    this.name = "AssetPreflightError";
  }
}
export interface AssetPreflightTarget {
  configPath: string;
  mode: "local" | "remote";
  databaseName: string;
}
export interface AssetReleaseCheck {
  key: string;
  category: "schema" | "migration" | "metadata";
  status: "pass" | "fail" | "skipped";
  code: string;
}
export interface AssetReleaseInspection {
  ready: boolean;
  checks: AssetReleaseCheck[];
}
type MetadataRow = Record<string, unknown>;
export type AssetPreflightTransport = (sql: string) => Promise<MetadataRow[]>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function fail(code: string): never {
  throw new AssetPreflightError(code);
}

/** No implicit environment or target; only a named JSON/JSONC config and one explicit mode. */
export function parseAssetPreflightArgs(argv: readonly string[]): {
  configPath: string;
  mode: "local" | "remote";
} {
  let configPath: string | undefined;
  let mode: "local" | "remote" | undefined;
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--local" || argument === "--remote") {
      if (mode) fail("EXPLICIT_TARGET_REQUIRED");
      mode = argument === "--local" ? "local" : "remote";
    } else if (argument === "--config" || argument.startsWith("--config=")) {
      if (configPath !== undefined) fail("CONFIG_ARGUMENT_INVALID");
      configPath =
        argument === "--config"
          ? argv[++index]
          : argument.slice("--config=".length);
      if (!configPath || configPath.startsWith("--"))
        fail("CONFIG_ARGUMENT_INVALID");
    } else fail("UNKNOWN_ARGUMENT");
  }
  if (!mode) fail("EXPLICIT_TARGET_REQUIRED");
  if (!configPath || !isAbsolute(configPath)) fail("ABSOLUTE_CONFIG_REQUIRED");
  return { configPath, mode };
}

export function loadAssetPreflightTarget(
  argv: readonly string[]
): AssetPreflightTarget {
  const { configPath, mode } = parseAssetPreflightArgs(argv);
  if (![".json", ".jsonc"].includes(extname(configPath).toLowerCase()))
    fail("JSON_CONFIG_REQUIRED");
  let source: string;
  let canonicalPath: string;
  try {
    const stat = lstatSync(configPath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
      fail("CONFIG_FILE_INVALID");
    canonicalPath = realpathSync(configPath);
    source = readFileSync(canonicalPath, "utf8");
  } catch {
    fail("CONFIG_FILE_INVALID");
  }
  let configuration: unknown;
  try {
    const parsed = ts.parseConfigFileTextToJson("wrangler.jsonc", source);
    if (parsed.error) fail("CONFIG_JSON_INVALID");
    configuration = parsed.config;
  } catch {
    fail("CONFIG_JSON_INVALID");
  }
  if (!record(configuration)) fail("CONFIG_JSON_INVALID");
  const databases = configuration.d1_databases;
  if (!Array.isArray(databases)) fail("DATABASE_BINDING_REQUIRED");
  const selected = databases.filter(
    (item: unknown) => record(item) && item.binding === "DB"
  );
  if (selected.length !== 1 || !record(selected[0]))
    fail("DATABASE_BINDING_REQUIRED");
  const binding = selected[0];
  if (
    typeof binding.database_name !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(binding.database_name) ||
    typeof binding.database_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      binding.database_id
    ) ||
    /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(binding.database_id)
  )
    fail("DATABASE_TARGET_INVALID");
  if (
    binding.migrations_table !== undefined &&
    binding.migrations_table !== "d1_migrations"
  )
    fail("MIGRATION_LEDGER_UNSUPPORTED");
  return {
    configPath: canonicalPath,
    mode,
    databaseName: binding.database_name,
  };
}

export function parseWranglerMetadata(source: string): MetadataRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    fail("WRANGLER_RESPONSE_INVALID");
  }
  if (!Array.isArray(parsed) || parsed.length === 0)
    fail("WRANGLER_RESPONSE_INVALID");
  const rows: MetadataRow[] = [];
  for (const entry of parsed) {
    if (
      !record(entry) ||
      entry.success !== true ||
      !Array.isArray(entry.results)
    )
      fail("WRANGLER_RESPONSE_INVALID");
    for (const row of entry.results) {
      if (!record(row)) fail("WRANGLER_RESPONSE_INVALID");
      rows.push(row);
    }
  }
  if (rows.length > 100) fail("WRANGLER_RESPONSE_INVALID");
  return rows;
}

export interface WranglerInvocation {
  program: string;
  args: string[];
  options: {
    cwd: string;
    shell: false;
    windowsHide: true;
    encoding: "utf8";
    timeout: number;
    maxBuffer: number;
    env: NodeJS.ProcessEnv;
  };
}
export type WranglerExecutor = (
  invocation: WranglerInvocation
) => Promise<string>;
const execFileAsync = promisify(execFile);
const runWrangler: WranglerExecutor = async ({ program, args, options }) => {
  try {
    return (await execFileAsync(program, args, options)).stdout;
  } catch {
    fail("WRANGLER_COMMAND_FAILED");
  }
};

export function createWranglerAssetTransport(
  target: AssetPreflightTarget,
  execute: WranglerExecutor = runWrangler
): AssetPreflightTransport {
  const require = createRequire(import.meta.url);
  const wranglerEntry = resolve(
    dirname(require.resolve("wrangler/package.json")),
    "bin/wrangler.js"
  );
  return async (sql) => {
    const executableSql = sql
      .replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, "")
      .replace(/'(?:''|[^'])*'/g, "''");
    if (
      !allowedQueries.has(sql) ||
      !/^\s*(SELECT|WITH)\b/i.test(executableSql) ||
      /\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP|ATTACH|DETACH|PRAGMA|VACUUM)\b/i.test(
        executableSql
      )
    )
      fail("QUERY_NOT_ALLOWED");
    let output: string;
    try {
      output = await execute({
        program: process.execPath,
        args: [
          wranglerEntry,
          "d1",
          "execute",
          "DB",
          "--config",
          target.configPath,
          target.mode === "remote" ? "--remote" : "--local",
          `--command=${sql}`,
          "--json",
        ],
        options: {
          cwd: dirname(target.configPath),
          shell: false,
          windowsHide: true,
          encoding: "utf8",
          timeout: 60_000,
          maxBuffer: 4 * 1024 * 1024,
          env: {
            ...process.env,
            WRANGLER_SEND_METRICS: "false",
            CI: "true",
            NO_COLOR: "1",
          },
        },
      });
    } catch {
      fail("WRANGLER_COMMAND_FAILED");
    }
    return parseWranglerMetadata(output);
  };
}

function names(rows: MetadataRow[], column: string): Set<string> {
  const values = rows.map((row) => row[column]);
  if (values.some((value) => typeof value !== "string"))
    fail("METADATA_RESULT_INVALID");
  const strings = values.filter(
    (value): value is string => typeof value === "string"
  );
  if (new Set(strings).size !== strings.length) fail("METADATA_RESULT_INVALID");
  return new Set(strings);
}

/** Query only schema, migration ledger and fixed navigation/RBAC metadata, never asset contents. */
export async function inspectEnterpriseAssetRelease(
  query: AssetPreflightTransport
): Promise<AssetReleaseInspection> {
  const checks: AssetReleaseCheck[] = [];
  const tables = names(await query(discoverySql), "name");
  const columns = await query(columnsSql);
  for (const row of columns) {
    if (
      typeof row.table_name !== "string" ||
      !metadataTables.includes(row.table_name) ||
      typeof row.column_name !== "string"
    )
      fail("METADATA_RESULT_INVALID");
  }
  for (const table of assetReleaseTables) {
    const exists = tables.has(table);
    checks.push({
      key: `schema:${table}`,
      category: "schema",
      status: exists ? "pass" : "fail",
      code: exists ? "READY" : "ASSET_TABLE_MISSING",
    });
  }
  const usable = new Set<string>();
  for (const [table, expected] of Object.entries(metadataColumns)) {
    const present = columns
      .filter((row) => row.table_name === table)
      .map((row) => row.column_name);
    const valid =
      tables.has(table) && expected.every((name) => present.includes(name));
    if (valid) usable.add(table);
    checks.push({
      key: `metadata-schema:${table}`,
      category: table === "d1_migrations" ? "migration" : "metadata",
      status: valid ? "pass" : "fail",
      code: valid
        ? "READY"
        : tables.has(table)
          ? "METADATA_SCHEMA_INVALID"
          : table === "d1_migrations"
            ? "MIGRATION_LEDGER_MISSING"
            : "METADATA_TABLE_MISSING",
    });
  }
  const applied = usable.has("d1_migrations")
    ? names(await query(migrationsSql), "name")
    : new Set<string>();
  for (const name of migrationNames) {
    checks.push({
      key: `migration:${name}`,
      category: "migration",
      status: usable.has("d1_migrations")
        ? applied.has(name)
          ? "pass"
          : "fail"
        : "skipped",
      code: usable.has("d1_migrations")
        ? applied.has(name)
          ? "READY"
          : "MIGRATION_MISSING"
        : "MIGRATION_LEDGER_UNAVAILABLE",
    });
  }
  const metadataUsable = metadataTables
    .filter((table) => table !== "d1_migrations")
    .every((table) => usable.has(table));
  if (metadataUsable) {
    const rows = await query(assetMetadataContractSql);
    const found = names(rows, "check_key");
    if (
      found.size !== metadataChecks.length ||
      metadataChecks.some((key) => !found.has(key))
    )
      fail("METADATA_RESULT_INVALID");
    for (const row of rows) {
      if (typeof row.code !== "string" || !metadataCodes.has(row.code))
        fail("METADATA_RESULT_INVALID");
      checks.push({
        key: String(row.check_key),
        category: "metadata",
        status: row.code === "READY" ? "pass" : "fail",
        code: row.code,
      });
    }
  } else {
    checks.push(
      ...metadataChecks.map(
        (key): AssetReleaseCheck => ({
          key,
          category: "metadata",
          status: "skipped",
          code: "METADATA_UNAVAILABLE",
        })
      )
    );
  }
  return { ready: checks.every((check) => check.status === "pass"), checks };
}

async function main() {
  const target = loadAssetPreflightTarget(process.argv.slice(2));
  const inspection = await inspectEnterpriseAssetRelease(
    createWranglerAssetTransport(target)
  );
  console.log(
    JSON.stringify(
      {
        reportVersion: 1,
        target: {
          mode: target.mode,
          binding: "DB",
          databaseName: target.databaseName,
        },
        ...inspection,
      },
      null,
      2
    )
  );
  if (!inspection.ready) process.exitCode = 2;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        ready: false,
        errorCode:
          error instanceof AssetPreflightError
            ? error.code
            : "PREFLIGHT_FAILED",
      })
    );
    process.exitCode = 1;
  });
}
