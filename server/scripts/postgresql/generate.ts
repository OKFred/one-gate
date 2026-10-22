import { createRequire } from "node:module";
import { readFile, writeFile, lstat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as registry from "./schema";

const require = createRequire(import.meta.url);
export const postgresServerRoot = fileURLToPath(
  new URL("../../", import.meta.url)
);
export const postgresSchemaSqlPath = resolve(
  postgresServerRoot,
  "apps/server/postgresql-schema.sql"
);
export const postgresTables = Object.values<unknown>(registry).filter(
  (value): value is PgTable => is(value, PgTable)
);
export const postgresTableNames = postgresTables
  .map((table) => getTableConfig(table).name)
  .sort();

/** Drizzle uses public for unqualified FKs; remove only that generated reference form. */
export function normalizeGeneratedPostgresSql(output: string): string {
  let sql = output.replace(/\r\n/g, "\n").trim();
  const actual = [...sql.matchAll(/^CREATE TABLE "([a-z0-9_]+)" \(/gm)]
    .map((match) => match[1])
    .sort();
  if (actual.join("\n") !== postgresTableNames.join("\n"))
    throw new Error("Unexpected PostgreSQL table set");
  sql = sql.replace(
    /REFERENCES "public"\."([a-z0-9_]+)"/g,
    (_match, table: string) => {
      if (!postgresTableNames.includes(table))
        throw new Error("Unexpected PostgreSQL foreign key target");
      return `REFERENCES "${table}"`;
    }
  );
  if (/"(?:public|auth|storage|pg_catalog)"\./.test(sql))
    throw new Error("Unexpected PostgreSQL schema qualification");
  if (
    /\b(?:DROP|TRUNCATE|GRANT|REVOKE|COPY|CREATE\s+(?:ROLE|DATABASE|SCHEMA))\b/i.test(
      sql
    )
  )
    throw new Error("Unexpected PostgreSQL DDL operation");
  for (const match of sql.matchAll(/(?:CONSTRAINT|INDEX) "([^"]+)"/g)) {
    if (Buffer.byteLength(match[1], "utf8") > 63)
      throw new Error("PostgreSQL identifier exceeds 63 bytes");
  }
  return `${sql}\n\nINSERT INTO "one_gate_write_guard" ("id") VALUES (1);\n`;
}

export function generatePostgresSql(): string {
  const cli = resolve(dirname(require.resolve("drizzle-kit")), "bin.cjs");
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "export",
      "--dialect=postgresql",
      "--schema=./scripts/postgresql/schema.ts",
    ],
    {
      cwd: postgresServerRoot,
      encoding: "utf8",
      shell: false,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    }
  );
  if (result.status !== 0 || result.error)
    throw new Error("PostgreSQL schema generation failed");
  return normalizeGeneratedPostgresSql(result.stdout);
}

export async function checkPostgresDdl(
  write = false
): Promise<"current" | "updated"> {
  const generated = generatePostgresSql();
  let existing: string | null = null;
  try {
    const info = await lstat(postgresSchemaSqlPath);
    if (!info.isFile() || info.isSymbolicLink())
      throw new Error("PostgreSQL DDL target must be a regular file");
    existing = await readFile(postgresSchemaSqlPath, "utf8");
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  if (existing === generated) return "current";
  if (!write)
    throw new Error(
      "PostgreSQL schema DDL differs; run the explicit --write command and add a new migration"
    );
  await writeFile(postgresSchemaSqlPath, generated, "utf8");
  return "updated";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--write") || args.length > 1)
    throw new Error("Use only the optional --write flag");
  console.log(
    `PostgreSQL schema: ${await checkPostgresDdl(args.includes("--write"))}; numbered migrations unchanged`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch(() => {
    console.error(
      "PostgreSQL schema generation/check failed; database and migration history unchanged"
    );
    process.exitCode = 1;
  });
}
