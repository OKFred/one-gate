import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverRoot = fileURLToPath(new URL("../", import.meta.url));
export const usageTableNames = [
  "cloudflare_usage_daily",
  "cloudflare_usage_snapshot",
  "cloudflare_usage_sync",
] as const;
const startMarker = "-- cloudflare-usage-contract-start";
const endMarker = "-- cloudflare-usage-contract-end";
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const normalize = (value: string) =>
  value
    .replace(/IF NOT EXISTS /gi, "")
    .replace(/[\s"`]/g, "")
    .toLowerCase();
const normalizedSql =
  "LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '\"', ''), CHAR(96), ''))";

/** Only the three registered tables are exported; historical migrations are never generated over. */
export function generateUsageArtifacts(): ReadonlyMap<string, string> {
  const require = createRequire(import.meta.url);
  const bin = resolve(dirname(require.resolve("drizzle-kit")), "bin.cjs");
  const generated = spawnSync(
    process.execPath,
    [
      bin,
      "export",
      "--dialect=sqlite",
      "--schema=./packages/admin/src/maintenance/cloudflare-usage/model.ts",
    ],
    { cwd: serverRoot, encoding: "utf8", shell: false, timeout: 120_000 }
  );
  if (generated.error || generated.status !== 0)
    throw new Error("Targeted Cloudflare usage DDL generation failed");
  const grouped = new Map<string, string[]>(
    usageTableNames.map((name) => [name, []])
  );
  const predicates = new Map<string, string[]>(
    usageTableNames.map((name) => [name, []])
  );
  const created = new Set<string>();
  const statements = generated.stdout
    .replace(/\r\n/g, "\n")
    .split(/--> statement-breakpoint|;\s*(?=CREATE|$)/)
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of statements) {
    const statement = part.endsWith(";") ? part : part + ";";
    const table = /^CREATE TABLE `([a-z_]+)` \(/.exec(statement);
    const index = /^CREATE (?:UNIQUE )?INDEX `([a-z_]+)` ON `([a-z_]+)`/.exec(
      statement
    );
    const name = table?.[1] ?? index?.[2];
    if (
      !name ||
      !grouped.has(name) ||
      /\bDEFAULT\b|\bDROP\b|\bDELETE\b/i.test(statement)
    )
      throw new Error("Unexpected targeted Cloudflare usage DDL statement");
    if (table) {
      if (created.has(name)) throw new Error("Duplicate usage table");
      created.add(name);
    }
    const objectName = table?.[1] ?? index?.[1];
    predicates
      .get(name)
      ?.push(
        `EXISTS (SELECT 1 FROM sqlite_master WHERE type=${quote(table ? "table" : "index")} AND name=${quote(objectName!)} AND ${normalizedSql}=${quote(normalize(statement.slice(0, -1)))})`
      );
    grouped
      .get(name)
      ?.push(
        statement.replace(
          /^CREATE (TABLE|(?:UNIQUE )?INDEX) /,
          "CREATE $1 IF NOT EXISTS "
        )
      );
  }
  if (created.size !== usageTableNames.length)
    throw new Error("Missing registered Cloudflare usage table");
  const artifacts = new Map<string, string>();
  const contract = [
    "-- Read-only Cloudflare usage schema contract, generated from the targeted Drizzle schema.",
  ];
  for (const name of usageTableNames) {
    artifacts.set(
      `packages/core/src/db/sql/admin/${name}.sql`,
      grouped.get(name)!.join("\n\n") + "\n"
    );
    contract.push(
      `SELECT json(CASE WHEN ${predicates.get(name)!.join("\n  AND ")} THEN '{}' ELSE ${quote("invalid " + name + " schema")} END) AS ${name}_contract;`
    );
  }
  const standalone = contract.join("\n\n") + "\n";
  artifacts.set("apps/server/d1-contract/cloudflare-usage.sql", standalone);
  const target = "apps/server/d1-contract/worker-schema.sql";
  const current = readFileSync(resolve(serverRoot, target), "utf8").replace(
    /\r\n/g,
    "\n"
  );
  const start = current.indexOf(startMarker);
  const end = current.indexOf(endMarker);
  if (
    start < 0 !== end < 0 ||
    (start >= 0 &&
      (end < start ||
        current.split(startMarker).length !== 2 ||
        current.split(endMarker).length !== 2))
  )
    throw new Error("Invalid usage contract markers");
  const block = startMarker + "\n" + standalone + endMarker;
  artifacts.set(
    target,
    start < 0
      ? current.trimEnd() + "\n\n" + block + "\n"
      : current.slice(0, start) + block + current.slice(end + endMarker.length)
  );
  return artifacts;
}

function main(): void {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    args.some((arg) => !["--write", "--check"].includes(arg))
  )
    throw new Error("Usage: generate-cloudflare-usage.ts [--write|--check]");
  const artifacts = generateUsageArtifacts();
  for (const [file, content] of artifacts) {
    const path = resolve(serverRoot, file);
    if (args[0] === "--write") writeFileSync(path, content, "utf8");
    else if (readFileSync(path, "utf8") !== content)
      throw new Error(
        "Cloudflare usage DDL differs; regenerate explicitly with --write"
      );
  }
  console.log("Cloudflare usage DDL and contracts are current");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
