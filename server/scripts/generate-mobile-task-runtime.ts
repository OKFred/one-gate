import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseGeneratedDdl } from "./generate-ddl.js";

const root = fileURLToPath(new URL("../", import.meta.url));
export const mobileTaskRuntimeTableName = "admin_mobile_task_runtime";
const startMarker = "-- mobile-task-runtime-contract-start";
const endMarker = "-- mobile-task-runtime-contract-end";

/** Generate this one additive table using the existing guarded DDL parser. */
export function generateMobileTaskRuntimeArtifacts(): ReadonlyMap<
  string,
  string
> {
  const require = createRequire(import.meta.url);
  const bin = resolve(dirname(require.resolve("drizzle-kit")), "bin.cjs");
  const source = execFileSync(
    process.execPath,
    [
      bin,
      "export",
      "--dialect=sqlite",
      "--schema=./packages/admin/src/mobile/async-task/runtime/model.ts",
    ],
    { cwd: root, encoding: "utf8", timeout: 120_000 }
  );
  const tables = parseGeneratedDdl(source);
  const ddl = tables.get(mobileTaskRuntimeTableName);
  if (tables.size !== 1 || !ddl || /\bDEFAULT\b/i.test(ddl))
    throw new Error("Unexpected mobile task runtime DDL");
  const definition = ddl.trim().replace(" IF NOT EXISTS", "").replace(/;$/, "");
  const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
  const contract = `-- Read-only mobile task runtime contract, generated from its targeted Drizzle schema.\n\nSELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name=${literal(mobileTaskRuntimeTableName)} AND sql=${literal(definition)})\n  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name=${literal(mobileTaskRuntimeTableName)} AND type IN ('index','trigger') AND sql IS NOT NULL)\n  AND NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check(${literal(mobileTaskRuntimeTableName)}))\n  THEN '{}' ELSE 'invalid mobile task runtime schema' END) AS mobile_task_runtime_contract;\n`;
  const workerContract = "apps/server/d1-contract/worker-schema.sql";
  const previous = readFileSync(resolve(root, workerContract), "utf8");
  const start = previous.indexOf(startMarker);
  const end = previous.indexOf(endMarker);
  if (
    start < 0 !== end < 0 ||
    (start >= 0 &&
      (end < start ||
        previous.split(startMarker).length !== 2 ||
        previous.split(endMarker).length !== 2))
  )
    throw new Error("Invalid mobile runtime contract markers");
  const block = startMarker + "\n" + contract + endMarker;
  return new Map([
    ["packages/core/src/db/sql/admin/admin_mobile_task_runtime.sql", ddl],
    ["apps/server/d1-contract/mobile-task-runtime.sql", contract],
    [
      "apps/server/d1-migrations/0022_mobile_task_runtime.sql",
      ddl + "\n" + contract,
    ],
    [
      workerContract,
      start < 0
        ? previous.trimEnd() + "\n\n" + block + "\n"
        : previous.slice(0, start) +
          block +
          previous.slice(end + endMarker.length),
    ],
  ]);
}

function main(): void {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    args.some((arg) => !["--write", "--check"].includes(arg))
  )
    throw new Error("Use generate-mobile-task-runtime.ts [--write|--check]");
  const artifacts = generateMobileTaskRuntimeArtifacts();
  for (const [file, content] of artifacts) {
    const target = resolve(root, file);
    if (args[0] === "--write") {
      if (
        file.includes("/d1-migrations/") &&
        existsSync(target) &&
        readFileSync(target, "utf8") !== content
      )
        throw new Error("Numbered mobile runtime migration is immutable");
    } else if (!existsSync(target) || readFileSync(target, "utf8") !== content)
      throw new Error(
        "Mobile runtime DDL differs; regenerate explicitly with --write"
      );
  }
  if (args[0] === "--write")
    for (const [file, content] of artifacts)
      writeFileSync(resolve(root, file), content, "utf8");
  console.log("Mobile task runtime DDL and contract are current");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
