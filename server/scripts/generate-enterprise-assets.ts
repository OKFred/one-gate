import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = "apps/server/d1-contract/enterprise-assets.sql";
const workerContractPath = "apps/server/d1-contract/worker-schema.sql";
const startMarker = "-- enterprise-assets-contract-start";
const endMarker = "-- enterprise-assets-contract-end";
export const assetTableNames = [
  "enterprise_asset_assignment",
  "enterprise_asset_identifier",
  "enterprise_asset_measurement_binding",
  "enterprise_asset",
  "enterprise_tenant_api_token_grant",
  "enterprise_tenant_member",
  "enterprise_tenant",
] as const;
const artifactPaths = [
  ...assetTableNames.map(
    (name) => "packages/core/src/db/sql/enterprise/" + name + ".sql"
  ),
  contractPath,
  workerContractPath,
];

type JsonObject = Record<string, unknown>;
type Named<T> = ReadonlyArray<readonly [string, T]>;
interface Column {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  autoincrement: boolean;
}
interface Index {
  name: string;
  columns: string[];
  isUnique: boolean;
  where?: string;
}
interface ForeignKey {
  name: string;
  tableFrom: string;
  tableTo: string;
  columnsFrom: string[];
  columnsTo: string[];
  onUpdate: string;
  onDelete: string;
}
interface Check {
  name: string;
  value: string;
}
interface Table {
  columns: Named<Column>;
  indexes: Named<Index>;
  foreignKeys: Named<ForeignKey>;
  checks: Named<Check>;
}

function invalid(message: string): never {
  throw new Error("Unsupported or invalid enterprise asset schema: " + message);
}
function object(value: unknown, at: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return invalid(at);
  return value as JsonObject;
}
function fields(value: JsonObject, allowed: string[], at: string): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) invalid(at + "." + key);
}
function text(value: unknown, at: string): string {
  if (typeof value !== "string" || !value) return invalid(at);
  return value;
}
function identifier(value: unknown, at: string): string {
  const result = text(value, at);
  if (!/^[a-z][a-z0-9_]*$/.test(result)) invalid(at);
  return result;
}
function bool(value: unknown, at: string): boolean {
  if (typeof value !== "boolean") return invalid(at);
  return value;
}
function identifiers(value: unknown, at: string): string[] {
  if (!Array.isArray(value) || !value.length) return invalid(at);
  const result = value.map((item: unknown) => identifier(item, at));
  if (new Set(result).size !== result.length) invalid(at + " duplicates");
  return result;
}
function empty(value: unknown, at: string): void {
  if (Object.keys(object(value, at)).length) invalid(at);
}
function named<T>(
  value: unknown,
  at: string,
  parse: (entry: JsonObject, name: string) => T
): Named<T> {
  return Object.entries(object(value, at)).map(([name, entry]) => {
    identifier(name, at + " key");
    const item = object(entry, at + "." + name);
    if (item.name !== name) invalid(at + "." + name + ".name");
    return [name, parse(item, name)] as const;
  });
}

/** The existing SQL contract removes whitespace/identifier quotes, so ambiguous literals fail closed. */
function predicate(value: unknown, at: string): string {
  const expression = text(value, at);
  const literals = expression.match(/'(?:[^']|'')*'/g) ?? [];
  for (const literal of literals)
    if (/[\s"\x60]/.test(literal))
      invalid(at + " has unsupported literal whitespace or quotes");
  const outside = expression.replace(/'(?:[^']|'')*'/g, "");
  if (
    outside.includes("'") ||
    /;|--|\/\*|\*\//.test(outside) ||
    /[^a-zA-Z0-9_\s".\x60()<>!=,+*/%-]/.test(outside)
  )
    invalid(at + " has unsupported SQL syntax");
  for (const quoted of outside.match(/"[^"]*"|\x60[^\x60]*\x60/g) ?? [])
    identifier(quoted.slice(1, -1), at + " identifier");
  if (outside.replace(/"[^"]*"|\x60[^\x60]*\x60/g, "").match(/["\x60]/))
    invalid(at + " has unmatched quotes");
  return expression;
}

function parseSnapshot(snapshot: unknown): Named<Table> {
  const input = object(snapshot, "snapshot");
  fields(
    input,
    [
      "version",
      "dialect",
      "id",
      "prevId",
      "tables",
      "views",
      "enums",
      "_meta",
      "internal",
    ],
    "snapshot"
  );
  if (input.version !== "6" || input.dialect !== "sqlite")
    invalid("snapshot version/dialect");
  empty(input.views, "views");
  empty(input.enums, "enums");
  const metadata = object(input._meta, "_meta");
  fields(metadata, ["schemas", "tables", "columns"], "_meta");
  for (const [key, value] of Object.entries(metadata))
    empty(value, "_meta." + key);
  const internal = object(input.internal, "internal");
  fields(internal, ["indexes"], "internal");
  empty(internal.indexes, "internal.indexes");
  const rawTables = object(input.tables, "tables");
  if (
    Object.keys(rawTables).length !== assetTableNames.length ||
    assetTableNames.some((name) => !Object.hasOwn(rawTables, name))
  )
    invalid("expected exactly the seven registered asset tables");
  const tables = named(rawTables, "tables", (table, name): Table => {
    fields(
      table,
      [
        "name",
        "columns",
        "indexes",
        "foreignKeys",
        "compositePrimaryKeys",
        "uniqueConstraints",
        "checkConstraints",
      ],
      name
    );
    empty(table.compositePrimaryKeys, name + ".compositePrimaryKeys");
    empty(table.uniqueConstraints, name + ".uniqueConstraints");
    const columns = named(
      table.columns,
      name + ".columns",
      (column, columnName): Column => {
        fields(
          column,
          ["name", "type", "primaryKey", "notNull", "autoincrement"],
          name + "." + columnName
        );
        const result = {
          name: columnName,
          type: text(column.type, name + "." + columnName + ".type"),
          primaryKey: bool(column.primaryKey, columnName + ".primaryKey"),
          notNull: bool(column.notNull, columnName + ".notNull"),
          autoincrement: bool(
            column.autoincrement,
            columnName + ".autoincrement"
          ),
        };
        if (!["integer", "text"].includes(result.type))
          invalid(name + "." + columnName + " type");
        if (
          result.primaryKey !== result.autoincrement ||
          (result.primaryKey &&
            (columnName !== "id" ||
              result.type !== "integer" ||
              !result.notNull))
        )
          invalid(name + "." + columnName + " primary key");
        return result;
      }
    );
    if (columns.filter(([, column]) => column.primaryKey).length !== 1)
      invalid(name + " primary key");
    const columnNames = columns.map(([columnName]) => columnName);
    function localColumns(value: unknown, at: string): string[] {
      const result = identifiers(value, at);
      if (result.some((column) => !columnNames.includes(column)))
        invalid(at + " unknown column");
      return result;
    }
    const indexes = named(
      table.indexes,
      name + ".indexes",
      (index, indexName): Index => {
        fields(index, ["name", "columns", "isUnique", "where"], indexName);
        return {
          name: indexName,
          columns: localColumns(index.columns, indexName + ".columns"),
          isUnique: bool(index.isUnique, indexName + ".isUnique"),
          ...(index.where === undefined
            ? {}
            : { where: predicate(index.where, indexName + ".where") }),
        };
      }
    );
    const foreignKeys = named(
      table.foreignKeys,
      name + ".foreignKeys",
      (fk, fkName): ForeignKey => {
        fields(
          fk,
          [
            "name",
            "tableFrom",
            "tableTo",
            "columnsFrom",
            "columnsTo",
            "onUpdate",
            "onDelete",
          ],
          fkName
        );
        if (fk.tableFrom !== name) invalid(fkName + ".tableFrom");
        const from = localColumns(fk.columnsFrom, fkName + ".columnsFrom");
        const to = identifiers(fk.columnsTo, fkName + ".columnsTo");
        if (from.length !== to.length) invalid(fkName + " column count");
        const actions = [
          "no action",
          "restrict",
          "cascade",
          "set null",
          "set default",
        ];
        const onUpdate = text(fk.onUpdate, fkName + ".onUpdate");
        const onDelete = text(fk.onDelete, fkName + ".onDelete");
        if (!actions.includes(onUpdate) || !actions.includes(onDelete))
          invalid(fkName + " action");
        return {
          name: fkName,
          tableFrom: name,
          tableTo: identifier(fk.tableTo, fkName + ".tableTo"),
          columnsFrom: from,
          columnsTo: to,
          onUpdate,
          onDelete,
        };
      }
    );
    const checks = named(
      table.checkConstraints,
      name + ".checks",
      (check, checkName): Check => {
        fields(check, ["name", "value"], checkName);
        return {
          name: checkName,
          value: predicate(check.value, checkName + ".value"),
        };
      }
    );
    return { columns, indexes, foreignKeys, checks };
  });
  const tableMap = new Map(tables);
  const indexNames = new Set<string>();
  for (const [name, table] of tables) {
    for (const [indexName] of table.indexes) {
      if (indexNames.has(indexName)) invalid("duplicate index " + indexName);
      indexNames.add(indexName);
    }
    for (const [, fk] of table.foreignKeys) {
      const target = tableMap.get(fk.tableTo);
      if (
        !target ||
        fk.columnsTo.some(
          (column) => !target.columns.some(([key]) => key === column)
        )
      )
        invalid(name + " foreign-key target");
    }
  }
  return tables;
}

function ddlStatements(ddl: string): string[] {
  const statements = ddl
    .replace(/\r\n/g, "\n")
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!statements.length) invalid("empty DDL");
  for (const statement of statements) {
    const outside = statement.replace(
      /'(?:[^']|'')*'|"[^"]*"|\x60[^\x60]*\x60/g,
      ""
    );
    if (
      !outside.endsWith(";") ||
      outside.slice(0, -1).includes(";") ||
      /--|\/\*|\*\//.test(outside)
    )
      invalid("unrecognized DDL statement boundary");
  }
  return statements;
}

const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const normalize = (value: string) => value.replace(/[\s"\x60]/g, "");
const normalizedSql =
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '\"', ''), '" +
  String.fromCharCode(96) +
  "', '')";

export function materializeAssetArtifacts(
  ddl: string,
  snapshot: unknown,
  workerContract: string
): ReadonlyMap<string, string> {
  const tables = parseSnapshot(snapshot);
  const grouped = new Map(tables.map(([name]) => [name, [] as string[]]));
  const creations = new Set<string>();
  const indexes = new Set<string>();
  const expectedIndexes = new Map(
    tables.flatMap(([table, schema]) =>
      schema.indexes.map(
        ([name, index]) => [name, { table, unique: index.isUnique }] as const
      )
    )
  );
  for (const statement of ddlStatements(ddl)) {
    const tableMatch = statement.match(
      /^CREATE TABLE \x60([a-z][a-z0-9_]*)\x60 \(/
    );
    const indexMatch = statement.match(
      /^CREATE (UNIQUE )?INDEX \x60([a-z][a-z0-9_]*)\x60 ON \x60([a-z][a-z0-9_]*)\x60 \(/
    );
    const name = tableMatch?.[1] ?? indexMatch?.[3];
    if (!name || !grouped.has(name))
      invalid("unrecognized DDL statement or table");
    if (tableMatch) {
      if (creations.has(name)) invalid("duplicate CREATE TABLE " + name);
      creations.add(name);
    } else if (indexMatch) {
      const expected = expectedIndexes.get(indexMatch[2]);
      if (
        !expected ||
        expected.table !== name ||
        expected.unique !== Boolean(indexMatch[1]) ||
        indexes.has(indexMatch[2])
      )
        invalid("unexpected or duplicate CREATE INDEX " + indexMatch[2]);
      indexes.add(indexMatch[2]);
    }
    grouped.get(name)?.push(
      statement
        .replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ")
        .replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS ")
        .replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS ")
    );
  }
  if (creations.size !== tables.length || indexes.size !== expectedIndexes.size)
    invalid("missing DDL table or index");
  const contract = [
    "-- Read-only enterprise asset schema contract. Generated from the targeted Drizzle snapshot.",
  ];
  const artifacts = new Map<string, string>();
  for (const [name, table] of tables) {
    const predicates = [
      `(SELECT COUNT(*) FROM pragma_table_info(${quote(name)})) = ${table.columns.length}`,
    ];
    for (const [, column] of table.columns)
      predicates.push(
        `EXISTS (SELECT 1 FROM pragma_table_info(${quote(name)}) WHERE name = ${quote(column.name)} AND LOWER(type) = ${quote(column.type.toLowerCase())} AND "notnull" = ${+column.notNull} AND pk = ${+column.primaryKey} AND dflt_value IS NULL)`
      );
    for (const [, check] of table.checks)
      predicates.push(
        `EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ${quote(name)} AND INSTR(${normalizedSql}, ${quote(`CONSTRAINT${check.name}CHECK(${normalize(check.value)})`)}) > 0)`
      );
    for (const [, index] of table.indexes) {
      predicates.push(
        `EXISTS (SELECT 1 FROM pragma_index_list(${quote(name)}) WHERE name = ${quote(index.name)} AND "unique" = ${+index.isUnique} AND partial = ${+Boolean(index.where)})`
      );
      predicates.push(
        `(SELECT COUNT(*) FROM pragma_index_info(${quote(index.name)})) = ${index.columns.length}`
      );
      index.columns.forEach((column, seq) =>
        predicates.push(
          `EXISTS (SELECT 1 FROM pragma_index_info(${quote(index.name)}) WHERE seqno = ${seq} AND name = ${quote(column)})`
        )
      );
      if (index.where)
        predicates.push(
          `EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ${quote(index.name)} AND SUBSTR(${normalizedSql}, -LENGTH(${quote("WHERE" + normalize(index.where))})) = ${quote("WHERE" + normalize(index.where))})`
        );
    }
    predicates.push(
      `(SELECT COUNT(*) FROM pragma_foreign_key_list(${quote(name)})) = ${table.foreignKeys.reduce((count, [, fk]) => count + fk.columnsFrom.length, 0)}`
    );
    for (const [, fk] of table.foreignKeys) {
      const pairs = fk.columnsFrom
        .map(
          (from, seq) =>
            `(seq = ${seq} AND "from" = ${quote(from)} AND "to" = ${quote(fk.columnsTo[seq])})`
        )
        .join(" OR ");
      predicates.push(
        `EXISTS (SELECT id FROM pragma_foreign_key_list(${quote(name)}) WHERE "table" = ${quote(fk.tableTo)} AND on_delete = ${quote(fk.onDelete.toUpperCase())} AND on_update = ${quote(fk.onUpdate.toUpperCase())} AND (${pairs}) GROUP BY id HAVING COUNT(*) = ${fk.columnsFrom.length})`
      );
    }
    contract.push(
      `SELECT json(CASE WHEN\n  ${predicates.join("\n  AND ")}\nTHEN '{}' ELSE ${quote("invalid " + name + " schema")} END) AS ${name}_contract;`
    );
    artifacts.set(
      `packages/core/src/db/sql/enterprise/${name}.sql`,
      grouped.get(name)?.join("\n\n") + "\n"
    );
  }
  const standalone = contract.join("\n\n") + "\n";
  const starts = workerContract.split(startMarker).length - 1;
  const ends = workerContract.split(endMarker).length - 1;
  const start = workerContract.indexOf(startMarker);
  const end = workerContract.indexOf(endMarker);
  if (starts !== 1 || ends !== 1 || start >= end)
    invalid("worker contract requires one ordered LF marker pair");
  if (
    (start > 0 && workerContract[start - 1] !== "\n") ||
    workerContract[start + startMarker.length] !== "\n" ||
    workerContract[end - 1] !== "\n" ||
    (end + endMarker.length < workerContract.length &&
      workerContract[end + endMarker.length] !== "\n" &&
      workerContract.slice(
        end + endMarker.length,
        end + endMarker.length + 2
      ) !== "\r\n")
  )
    invalid("worker contract markers must occupy complete lines");
  artifacts.set(contractPath, standalone);
  artifacts.set(
    workerContractPath,
    workerContract.slice(0, start) +
      startMarker +
      "\n" +
      standalone +
      endMarker +
      workerContract.slice(end + endMarker.length)
  );
  return artifacts;
}

export function readCurrentAssetSchema(): { ddl: string; snapshot: unknown } {
  const temporaryRoot = realpathSync(tmpdir());
  const temporary = mkdtempSync(join(temporaryRoot, "one-gate-assets-"));
  try {
    const require = createRequire(import.meta.url);
    const drizzleBin = join(dirname(require.resolve("drizzle-kit")), "bin.cjs");
    execFileSync(
      process.execPath,
      [
        drizzleBin,
        "generate",
        "--dialect=sqlite",
        "--schema=./packages/enterprise/src/{tenant,asset}/model.ts",
        "--out=" + temporary.replaceAll("\\", "/"),
      ],
      { cwd: serverRoot, stdio: "pipe", timeout: 120_000 }
    );
    const sqlFiles = readdirSync(temporary).filter((name) =>
      name.endsWith(".sql")
    );
    if (sqlFiles.length !== 1) invalid("expected one fresh generated SQL file");
    const snapshot: unknown = JSON.parse(
      readFileSync(join(temporary, "meta/0000_snapshot.json"), "utf8")
    );
    return {
      ddl: readFileSync(join(temporary, sqlFiles[0]), "utf8"),
      snapshot,
    };
  } finally {
    if (
      dirname(temporary) !== temporaryRoot ||
      !basename(temporary).startsWith("one-gate-assets-") ||
      lstatSync(temporary).isSymbolicLink() ||
      realpathSync(temporary) !== temporary
    )
      throw new Error("Refusing to remove an unexpected temporary directory");
    rmSync(temporary, { recursive: true, force: true });
  }
}

export function generateAssetArtifacts(): ReadonlyMap<string, string> {
  const { ddl, snapshot } = readCurrentAssetSchema();
  return materializeAssetArtifacts(
    ddl,
    snapshot,
    readFileSync(join(serverRoot, workerContractPath), "utf8")
  );
}

function samePath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}
function realDirectory(directory: string): void {
  const entry = lstatSync(directory);
  if (
    !entry.isDirectory() ||
    entry.isSymbolicLink() ||
    !samePath(realpathSync(directory), directory)
  )
    throw new Error(
      "Refusing a symbolic or non-directory artifact parent: " + directory
    );
}

/** Restore controlled write failures; this is not a multi-file crash or power-loss transaction. */
export function syncAssetArtifacts(
  root: string,
  artifacts: ReadonlyMap<string, string>,
  mode: "check" | "write",
  writer: (file: string, content: string) => void = (file, content) =>
    writeFileSync(file, content, "utf8")
): string[] {
  if (!isAbsolute(root) || !["check", "write"].includes(mode))
    throw new Error("Expected an absolute server root and check/write mode");
  if (
    artifacts.size !== artifactPaths.length ||
    artifactPaths.some((file) => !artifacts.has(file))
  )
    throw new Error(
      "Expected exactly the nine registered enterprise asset artifacts"
    );
  const absoluteRoot = resolve(root);
  realDirectory(absoluteRoot);
  const plan = artifactPaths.map((relative) => {
    const target = join(absoluteRoot, relative);
    const parts = relative.split("/");
    let parent = absoluteRoot;
    for (const part of parts.slice(0, -1)) {
      parent = join(parent, part);
      realDirectory(parent);
    }
    let entry: ReturnType<typeof lstatSync> | undefined;
    try {
      entry = lstatSync(target);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
    if (
      entry &&
      (!entry.isFile() ||
        entry.isSymbolicLink() ||
        !samePath(realpathSync(target), target))
    )
      throw new Error(
        "Refusing a symbolic or non-file artifact target: " + relative
      );
    const content = artifacts.get(relative);
    if (
      typeof content !== "string" ||
      (relative !== workerContractPath &&
        (content.includes("\r") || content.charCodeAt(0) === 0xfeff))
    )
      throw new Error("Expected UTF-8/LF artifact content: " + relative);
    const original = entry ? readFileSync(target) : undefined;
    return { relative, target, content, original };
  });
  const changed = plan.filter(
    (item) => !item.original?.equals(Buffer.from(item.content, "utf8"))
  );
  if (mode === "write") {
    const attempted: typeof changed = [];
    try {
      for (const item of changed) {
        attempted.push(item);
        writer(item.target, item.content);
      }
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      for (const item of attempted.reverse()) {
        try {
          if (item.original) writeFileSync(item.target, item.original);
          else rmSync(item.target, { force: true });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length)
        throw new AggregateError(
          [error, ...rollbackErrors],
          "Asset artifact write failed and rollback was incomplete"
        );
      throw error;
    }
  }
  return changed.map((item) => item.relative);
}

function main(): void {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args[0] !== undefined && args[0] !== "--check" && args[0] !== "--write")
  )
    throw new Error(
      "Usage: generate-enterprise-assets.ts [--check|--write]; no snapshot or path arguments"
    );
  const mode = args[0] === "--write" ? "write" : "check";
  const changed = syncAssetArtifacts(
    serverRoot,
    generateAssetArtifacts(),
    mode
  );
  if (mode === "check" && changed.length) {
    console.error(
      "Enterprise asset artifacts differ:\n" +
        changed.join("\n") +
        "\nRun with --write to update fresh DDL/contracts, then create a new numbered migration separately."
    );
    process.exitCode = 1;
  } else {
    console.log(
      mode === "write"
        ? "Updated " +
            changed.length +
            " enterprise asset artifacts; numbered migrations were not changed."
        : "Enterprise asset DDL and contracts are current (9 files; read-only check)."
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Enterprise asset generation failed"
    );
    process.exitCode = 1;
  }
}
