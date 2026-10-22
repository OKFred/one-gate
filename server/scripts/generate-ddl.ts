import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultProjectRoot = fileURLToPath(new URL("../", import.meta.url));
const domains = ["enterprise", "admin", "personal"] as const;
const temporaryPrefix = "one-gate-ddl-";
const migrationGuide = "docs/database-migrations.md";
type Domain = (typeof domains)[number];

export interface DdlGenerationInput {
  readonly domain: Domain;
  readonly projectRoot: string;
  readonly outputDirectory: string;
}
export interface FullDdlOptions {
  readonly projectRoot?: string;
  readonly generate?: (input: DdlGenerationInput) => void | Promise<void>;
}
interface DdlCliOptions extends FullDdlOptions {
  readonly log?: (message: string) => void;
  readonly error?: (message: string) => void;
}

/** Split SQLite DDL without treating quoted semicolons or comments as boundaries. */
function statements(source: string): string[] {
  const result: string[] = [];
  let start = 0;
  let quote: "'" | '"' | "`" | "]" | undefined;
  let comment: "line" | "block" | undefined;
  for (let index = 0; index < source.length; index++) {
    const current = source[index];
    const next = source[index + 1];
    if (comment === "line") {
      if (current === "\n") comment = undefined;
    } else if (comment === "block") {
      if (current === "*" && next === "/") {
        comment = undefined;
        index++;
      }
    } else if (quote) {
      if (current === quote) {
        if (next === quote && quote !== "]") index++;
        else quote = undefined;
      }
    } else if (current === "-" && next === "-") {
      comment = "line";
      index++;
    } else if (current === "/" && next === "*") {
      comment = "block";
      index++;
    } else if (current === "'" || current === '"' || current === "`")
      quote = current;
    else if (current === "[") quote = "]";
    else if (current === ";") {
      result.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quote || comment === "block") throw new Error("Incomplete generated DDL");
  result.push(source.slice(start).trim());
  return result;
}

function withoutLeadingComments(source: string): string {
  let result = source.trim();
  while (result.startsWith("--") || result.startsWith("/*")) {
    const end = result.startsWith("--")
      ? result.indexOf("\n")
      : result.indexOf("*/") + 2;
    if (end < 0) return "";
    result = result.slice(end).trim();
  }
  return result;
}

export function parseGeneratedDdl(source: string): ReadonlyMap<string, string> {
  const identifier =
    '(?:"[^"\\r\\n]+"|`[^`\\r\\n]+`|\\[[^\\]\\r\\n]+\\]|[a-zA-Z_][a-zA-Z0-9_]*)';
  const tablePattern = new RegExp(
    `^CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${identifier})\\s*\\(`,
    "i"
  );
  const indexPattern = new RegExp(
    `^CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${identifier}\\s+ON\\s+(${identifier})\\s*\\(`,
    "i"
  );
  const tables = new Set<string>();
  const grouped = new Map<string, string[]>();
  for (const sourceStatement of statements(source)) {
    const statement = withoutLeadingComments(sourceStatement);
    if (!statement) continue;
    const table = tablePattern.exec(statement);
    const index = table ? null : indexPattern.exec(statement);
    const rawName = table?.[1] ?? index?.[1];
    if (!rawName) throw new Error("Expected fresh CREATE TABLE/INDEX DDL");
    const name = ['"', "`", "["].some((prefix) => rawName.startsWith(prefix))
      ? rawName.slice(1, -1)
      : rawName;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))
      throw new Error("Unsafe generated table name");
    if (table) {
      if (tables.has(name)) throw new Error("Duplicate generated table");
      tables.add(name);
    }
    const normalized = statement
      .replace(
        /^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\s+)/i,
        "CREATE TABLE IF NOT EXISTS "
      )
      .replace(
        /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS\s+)/i,
        (_match: string, unique: string | undefined) =>
          unique
            ? "CREATE UNIQUE INDEX IF NOT EXISTS "
            : "CREATE INDEX IF NOT EXISTS "
      );
    const group = grouped.get(name) ?? [];
    group.push(`${normalized};`);
    grouped.set(name, group);
  }
  if (!tables.size || [...grouped.keys()].some((name) => !tables.has(name)))
    throw new Error("Generated DDL is missing table definitions");
  return new Map(
    [...grouped].map(([name, ddl]) => [name, ddl.join("\n\n") + "\n"])
  );
}

function generateWithDrizzle(input: DdlGenerationInput): void {
  const require = createRequire(import.meta.url);
  const executable = path.join(
    path.dirname(require.resolve("drizzle-kit")),
    "bin.cjs"
  );
  execFileSync(
    process.execPath,
    [
      executable,
      "generate",
      "--dialect=sqlite",
      `--schema=./packages/${input.domain}/**/model.ts`,
      `--out=${input.outputDirectory.replaceAll("\\", "/")}`,
    ],
    {
      cwd: input.projectRoot,
      shell: false,
      windowsHide: true,
      stdio: "pipe",
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    }
  );
}

function assertOutputPath(projectRoot: string, file: string): void {
  const relative = path.relative(projectRoot, file);
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`)
  )
    throw new Error("Output path is outside the project");
  let current = projectRoot;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    let info: fs.Stats;
    try {
      info = fs.lstatSync(current);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        continue;
      throw error;
    }
    if (
      info.isSymbolicLink() ||
      (current === file ? !info.isFile() : !info.isDirectory())
    )
      throw new Error("Output path must not contain links or special files");
  }
}

function cleanupTemporaryDirectory(
  temporary: string,
  temporaryRoot: string
): void {
  if (
    path.dirname(temporary) !== temporaryRoot ||
    !path.basename(temporary).startsWith(temporaryPrefix) ||
    fs.lstatSync(temporary).isSymbolicLink() ||
    fs.realpathSync(temporary) !== temporary
  )
    throw new Error("Refusing cleanup of an unexpected temporary directory");
  fs.rmSync(temporary, { recursive: true, force: true });
}

/** Generate every domain first; historical migrations are never output or cleanup targets. */
export async function generateFullDdl(
  options: FullDdlOptions = {}
): Promise<readonly string[]> {
  const projectRoot = fs.realpathSync(
    options.projectRoot ?? defaultProjectRoot
  );
  const temporaryRoot = fs.realpathSync(tmpdir());
  const temporary = fs.mkdtempSync(path.join(temporaryRoot, temporaryPrefix));
  const generate = options.generate ?? generateWithDrizzle;
  try {
    const files = new Map<string, string>();
    for (const domain of domains) {
      const outputDirectory = path.join(temporary, domain);
      await generate({ domain, projectRoot, outputDirectory });
      if (
        !fs.existsSync(outputDirectory) ||
        fs.lstatSync(outputDirectory).isSymbolicLink()
      )
        throw new Error("Generator did not create a regular output directory");
      const sqlFiles = fs
        .readdirSync(outputDirectory)
        .filter((name) => name.endsWith(".sql"))
        .sort();
      if (sqlFiles.length !== 1)
        throw new Error("Expected one fresh generated SQL file per domain");
      const sqlFile = path.join(outputDirectory, sqlFiles[0]);
      if (
        !fs.lstatSync(sqlFile).isFile() ||
        fs.lstatSync(sqlFile).isSymbolicLink()
      )
        throw new Error("Generated SQL must be a regular file");
      const grouped = parseGeneratedDdl(fs.readFileSync(sqlFile, "utf8"));
      for (const [name, ddl] of grouped)
        files.set(
          path.join(
            projectRoot,
            "packages/core/src/db/sql",
            domain,
            `${name}.sql`
          ),
          ddl
        );
    }
    for (const file of files.keys()) assertOutputPath(projectRoot, file);
    for (const [file, ddl] of files) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, ddl, "utf8");
    }
    return [...files.keys()].map((file) => path.relative(projectRoot, file));
  } finally {
    cleanupTemporaryDirectory(temporary, temporaryRoot);
  }
}

export async function runDdlGeneratorCli(
  args: readonly string[],
  options: DdlCliOptions = {}
): Promise<number> {
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  if (args.length === 1 && (args[0] === "--help" || args[0] === "help")) {
    log(
      `Usage: pnpm run db:generate\nGenerates fresh SQLite DDL only; does not migrate a database. See ${migrationGuide}.`
    );
    return 0;
  }
  if (args.length) {
    error(
      `Incremental generation and other arguments are unsupported. Use the controlled database migration commands in ${migrationGuide}.`
    );
    return 1;
  }
  try {
    const files = await generateFullDdl(options);
    log(
      `Generated ${files.length} SQLite DDL files; historical migrations were preserved.`
    );
    return 0;
  } catch {
    error(
      `SQLite DDL generation did not complete. See ${migrationGuide}; no database was migrated.`
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  void runDdlGeneratorCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
