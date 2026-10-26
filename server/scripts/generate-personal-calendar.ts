import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverRoot = fileURLToPath(new URL("../", import.meta.url));
export const calendarTableName = "personal_calendar_event";
const startMarker = "-- personal-calendar-contract-start";
const endMarker = "-- personal-calendar-contract-end";
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";

/** Export this feature's schema only; never rewrite historical migrations. */
function exportCalendarSql(dialect: "sqlite" | "postgresql"): string[] {
  const require = createRequire(import.meta.url);
  const bin = resolve(dirname(require.resolve("drizzle-kit")), "bin.cjs");
  const model = dialect === "sqlite" ? "model.ts" : "schema.pg.ts";
  const result = spawnSync(
    process.execPath,
    [
      bin,
      "export",
      `--dialect=${dialect}`,
      `--schema=./packages/personal/src/calendar/${model}`,
    ],
    { cwd: serverRoot, encoding: "utf8", shell: false, timeout: 120_000 }
  );
  if (result.error || result.status !== 0)
    throw new Error("Targeted personal calendar DDL generation failed");
  const statements = result.stdout
    .replace(/\r\n/g, "\n")
    .split(/--> statement-breakpoint|;\s*(?=CREATE|$)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.endsWith(";") ? part : part + ";"));
  let tableCount = 0;
  const names = new Set<string>();
  for (const statement of statements) {
    const table = /^CREATE TABLE ["`]([a-z_]+)["`] \(/.exec(statement);
    const index =
      /^CREATE (?:UNIQUE )?INDEX ["`]([a-z_]+)["`] ON ["`]([a-z_]+)["`]/.exec(
        statement
      );
    const tableName = table?.[1] ?? index?.[2];
    const objectName = table?.[1] ?? index?.[1];
    if (
      tableName !== calendarTableName ||
      !objectName ||
      names.has(objectName) ||
      /\b(?:DEFAULT|DROP|DELETE|INSERT|UPDATE|ALTER|REFERENCES)\b/i.test(
        statement
      )
    )
      throw new Error("Unexpected targeted personal calendar DDL statement");
    if (Buffer.byteLength(objectName, "utf8") > 63)
      throw new Error("Personal calendar SQL identifier is too long");
    names.add(objectName);
    if (table) tableCount++;
  }
  if (tableCount !== 1 || names.size !== 4)
    throw new Error("Incomplete personal calendar table or indexes");
  return statements;
}

export function generateCalendarArtifacts(): ReadonlyMap<string, string> {
  const sqlite = exportCalendarSql("sqlite");
  const freshSql =
    sqlite
      .map((statement) =>
        statement.replace(
          /^CREATE (TABLE|(?:UNIQUE )?INDEX) /,
          "CREATE $1 IF NOT EXISTS "
        )
      )
      .join("\n\n") + "\n";
  const predicates = sqlite.map((statement) => {
    const table = /^CREATE TABLE `([a-z_]+)`/.exec(statement);
    const index = /^CREATE (?:UNIQUE )?INDEX `([a-z_]+)`/.exec(statement);
    const name = table?.[1] ?? index?.[1];
    if (!name) throw new Error("Unexpected personal calendar SQLite object");
    // SQLite stores the original DDL minus IF NOT EXISTS and the final semicolon.
    // Preserve CHECK / partial-index string literal case and whitespace exactly.
    return `EXISTS (SELECT 1 FROM sqlite_master WHERE type=${quote(table ? "table" : "index")} AND name=${quote(name)} AND sql=${quote(statement.slice(0, -1))})`;
  });
  predicates.push(
    `NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name=${quote(calendarTableName)} AND type='trigger')`,
    `(SELECT count(*) FROM sqlite_master WHERE tbl_name=${quote(calendarTableName)} AND type='index' AND sql IS NOT NULL)=3`
  );
  const contract =
    "-- Read-only personal calendar schema contract, generated from its targeted Drizzle schema.\n\n" +
    `SELECT json(CASE WHEN ${predicates.join("\n  AND ")} THEN '{}' ELSE ${quote("invalid " + calendarTableName + " schema")} END) AS personal_calendar_event_contract;\n`;
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
    throw new Error("Invalid personal calendar contract markers");
  const block = startMarker + "\n" + contract + endMarker;
  return new Map([
    ["packages/core/src/db/sql/personal/personal_calendar_event.sql", freshSql],
    ["apps/server/d1-contract/personal-calendar.sql", contract],
    [
      "apps/server/d1-migrations/0020_personal_calendar.sql",
      freshSql + "\n" + contract,
    ],
    [
      "apps/server/postgresql-migrations/0003_personal_calendar.sql",
      exportCalendarSql("postgresql").join("\n\n") + "\n",
    ],
    [
      target,
      start < 0
        ? current.trimEnd() + "\n\n" + block + "\n"
        : current.slice(0, start) +
          block +
          current.slice(end + endMarker.length),
    ],
  ]);
}

function main(): void {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    args.some((arg) => !["--write", "--check"].includes(arg))
  )
    throw new Error("Usage: generate-personal-calendar.ts [--write|--check]");
  const artifacts = generateCalendarArtifacts();
  // Validate the complete publication before changing fresh DDL or contracts.
  if (args[0] === "--write") {
    for (const [file, content] of artifacts) {
      const target = resolve(serverRoot, file);
      if (
        /\/(?:d1|postgresql)-migrations\//.test(file) &&
        existsSync(target) &&
        readFileSync(target, "utf8") !== content
      )
        throw new Error(
          "Numbered personal calendar migration is immutable; add a new migration for schema changes"
        );
    }
    for (const [file, content] of artifacts)
      writeFileSync(resolve(serverRoot, file), content, "utf8");
  } else {
    for (const [file, content] of artifacts)
      if (readFileSync(resolve(serverRoot, file), "utf8") !== content)
        throw new Error(
          "Personal calendar DDL differs; regenerate explicitly with --write"
        );
  }
  console.log("Personal calendar DDL and contracts are current");
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
