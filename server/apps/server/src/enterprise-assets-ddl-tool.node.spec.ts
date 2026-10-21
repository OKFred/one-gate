import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  assetTableNames,
  materializeAssetArtifacts,
  readCurrentAssetSchema,
  syncAssetArtifacts,
} from "../../../scripts/generate-enterprise-assets";

const serverRoot = fileURLToPath(new URL("../../../", import.meta.url));
const workerPath = "apps/server/d1-contract/worker-schema.sql";
const workerContract = readFileSync(join(serverRoot, workerPath), "utf8");
const startMarker = "-- enterprise-assets-contract-start";
const endMarker = "-- enterprise-assets-contract-end";
const directories: string[] = [];
let schema: ReturnType<typeof readCurrentAssetSchema>;
let artifacts: ReadonlyMap<string, string>;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid test snapshot object");
  return value as Record<string, unknown>;
}
function modifiedSnapshot(change: (snapshot: Record<string, unknown>) => void) {
  const snapshot = object(structuredClone(schema.snapshot));
  change(snapshot);
  return snapshot;
}
function firstTable(snapshot: Record<string, unknown>) {
  return object(Object.values(object(snapshot.tables))[0]);
}
function fixtureRoot() {
  const directory = mkdtempSync(join(tmpdir(), "one-gate-assets-tool test-"));
  directories.push(directory);
  for (const [relative, content] of artifacts) {
    const file = join(directory, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  for (const relative of [
    "apps/server/d1-migrations/0016_enterprise_assets.sql",
    "apps/server/d1-migrations/0017_enterprise_asset_metadata.sql",
    "packages/core/src/db/migrations/existing.sql",
    "packages/core/src/db/migrations/meta/snapshot.json",
  ]) {
    const file = join(directory, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `existing migration: ${relative}\n`);
  }
  return directory;
}
function moveFixtureDirectory(root: string, from: string, to: string) {
  for (const target of [from, to]) {
    const within = relative(resolve(root), resolve(target));
    if (!within || isAbsolute(within) || within.startsWith(`..${sep}`))
      throw new Error("Unsafe fixture move path");
  }
  renameSync(from, to);
}
function contents(root: string) {
  return new Map(
    [...artifacts.keys()].map((relative) => [
      relative,
      existsSync(join(root, relative))
        ? readFileSync(join(root, relative), "utf8")
        : null,
    ])
  );
}
function modificationTimes(root: string) {
  return new Map(
    [...artifacts.keys()].map((relative) => [
      relative,
      statSync(join(root, relative), { bigint: true }).mtimeNs,
    ])
  );
}
function historyHashes(root: string): Map<string, string> {
  const result = new Map<string, string>();
  function visit(directory: string) {
    for (const entry of readdirSync(join(root, directory), {
      withFileTypes: true,
    })) {
      const relative = `${directory}/${entry.name}`;
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile())
        result.set(
          relative,
          createHash("sha256")
            .update(readFileSync(join(root, relative)))
            .digest("hex")
        );
      else throw new Error("Unexpected linked migration fixture");
    }
  }
  for (const directory of [
    "apps/server/d1-migrations",
    "packages/core/src/db/migrations",
  ]) {
    visit(directory);
  }
  return result;
}

beforeAll(() => {
  const history = historyHashes(serverRoot);
  schema = readCurrentAssetSchema();
  artifacts = materializeAssetArtifacts(
    schema.ddl,
    schema.snapshot,
    workerContract
  );
  expect(historyHashes(serverRoot)).toEqual(history);
}, 30_000);

afterEach(() => {
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    // Only remove directories created by this test beneath the OS temp root.
    if (
      dirname(absolute) !== resolve(tmpdir()) ||
      !basename(absolute).startsWith("one-gate-assets-tool test-")
    )
      throw new Error("Unsafe test cleanup path");
    rmSync(absolute, { recursive: true, force: true });
  }
});

describe("enterprise asset DDL maintenance", () => {
  it("reproduces the current nine artifacts without writing repository files", () => {
    const before = contents(serverRoot);
    const timestamps = modificationTimes(serverRoot);
    const history = historyHashes(serverRoot);
    expect(assetTableNames).toHaveLength(7);
    expect(artifacts.size).toBe(9);
    let writes = 0;
    expect(
      syncAssetArtifacts(serverRoot, artifacts, "check", () => writes++)
    ).toEqual([]);
    expect(writes).toBe(0);
    expect(contents(serverRoot)).toEqual(before);
    expect(modificationTimes(serverRoot)).toEqual(timestamps);
    expect(historyHashes(serverRoot)).toEqual(history);
  });

  it("reports drift in check mode without changing the drifted file", () => {
    const root = fixtureRoot();
    const relative = [...artifacts.keys()][0];
    writeFileSync(join(root, relative), "manually changed\n");
    const before = contents(root);
    expect(syncAssetArtifacts(root, artifacts, "check")).toEqual([relative]);
    expect(contents(root)).toEqual(before);
  });

  it("writes current artifacts idempotently while preserving numbered and historical migrations", () => {
    const root = fixtureRoot();
    const changed = [...artifacts.keys()].slice(0, 2);
    for (const relative of changed)
      writeFileSync(join(root, relative), "stale generated output\n");
    const history = historyHashes(root);
    expect(syncAssetArtifacts(root, artifacts, "write")).toEqual(changed);
    expect(contents(root)).toEqual(new Map(artifacts));
    expect(syncAssetArtifacts(root, artifacts, "check")).toEqual([]);
    expect(syncAssetArtifacts(root, artifacts, "write")).toEqual([]);
    expect(historyHashes(root)).toEqual(history);
  });

  it("restores all original bytes when a later writer partially writes and then throws", () => {
    const root = fixtureRoot();
    for (const relative of [...artifacts.keys()].slice(0, 3))
      writeFileSync(join(root, relative), `stale ${relative}\n`);
    const before = contents(root);
    const history = historyHashes(root);
    let writes = 0;
    expect(() =>
      syncAssetArtifacts(root, artifacts, "write", (file, content) => {
        if (++writes === 2) {
          writeFileSync(file, "partial write");
          throw new Error("simulated disk write failure");
        }
        writeFileSync(file, content);
      })
    ).toThrow();
    expect(writes).toBe(2);
    expect(contents(root)).toEqual(before);
    expect(historyHashes(root)).toEqual(history);
  });

  it("reports a missing output read-only and recreates it only in explicit write mode", () => {
    const root = fixtureRoot();
    const relative = [...artifacts.keys()][0];
    const missing = join(root, relative);
    rmSync(missing);
    expect(syncAssetArtifacts(root, artifacts, "check")).toEqual([relative]);
    expect(existsSync(missing)).toBe(false);
    const history = historyHashes(root);
    expect(syncAssetArtifacts(root, artifacts, "write")).toEqual([relative]);
    expect(contents(root)).toEqual(new Map(artifacts));
    expect(historyHashes(root)).toEqual(history);
  });

  it("removes newly created output when a later write fails", () => {
    const root = fixtureRoot();
    const [first, second] = [...artifacts.keys()];
    rmSync(join(root, first));
    writeFileSync(join(root, second), "old second output\n");
    const before = contents(root);
    let writes = 0;
    expect(() =>
      syncAssetArtifacts(root, artifacts, "write", (file, content) => {
        writeFileSync(file, content);
        if (++writes === 2) throw new Error("late failure after file creation");
      })
    ).toThrow();
    expect(writes).toBe(2);
    expect(contents(root)).toEqual(before);
    expect(existsSync(join(root, first))).toBe(false);
  });

  it("preflights every target before writing when a later target is a directory", () => {
    const root = fixtureRoot();
    const [early] = artifacts.keys();
    writeFileSync(join(root, early), "keep this drift\n");
    const later = join(root, [...artifacts.keys()].at(-1)!);
    rmSync(later);
    mkdirSync(later);
    let writes = 0;
    expect(() =>
      syncAssetArtifacts(root, artifacts, "write", () => writes++)
    ).toThrow();
    expect(writes).toBe(0);
    expect(readFileSync(join(root, early), "utf8")).toBe("keep this drift\n");
  });

  it("refuses a missing output parent before changing earlier files", () => {
    const root = fixtureRoot();
    const [early] = artifacts.keys();
    writeFileSync(join(root, early), "keep early output\n");
    const parent = dirname(join(root, workerPath));
    moveFixtureDirectory(root, parent, join(root, "moved-contract-directory"));
    let writes = 0;
    expect(() =>
      syncAssetArtifacts(root, artifacts, "write", () => writes++)
    ).toThrow();
    expect(writes).toBe(0);
    expect(readFileSync(join(root, early), "utf8")).toBe("keep early output\n");
  });

  it("rejects a linked parent directory without touching files reached through it", () => {
    const root = fixtureRoot();
    const parent = join(root, "packages/core/src/db/sql/enterprise");
    const original = join(root, "linked-output-target");
    moveFixtureDirectory(root, parent, original);
    symlinkSync(
      original,
      parent,
      process.platform === "win32" ? "junction" : "dir"
    );
    const before = contents(root);
    expect(() => syncAssetArtifacts(root, artifacts, "write")).toThrow();
    expect(contents(root)).toEqual(before);
  });

  it.each(["extra", "missing"] as const)(
    "rejects an artifact set with an %s target before writes",
    (kind) => {
      const root = fixtureRoot();
      const invalid = new Map(artifacts);
      if (kind === "extra")
        invalid.set(
          "apps/server/d1-migrations/0016_enterprise_assets.sql",
          "overwrite"
        );
      else invalid.delete(workerPath);
      const before = contents(root);
      let writes = 0;
      expect(() =>
        syncAssetArtifacts(root, invalid, "write", () => writes++)
      ).toThrow();
      expect(writes).toBe(0);
      expect(contents(root)).toEqual(before);
    }
  );

  it.each(["missing", "duplicate", "reversed"] as const)(
    "rejects %s deployment markers",
    (kind) => {
      const invalid =
        kind === "missing"
          ? workerContract.replace(startMarker, "-- omitted")
          : kind === "duplicate"
            ? `${workerContract}\n${startMarker}\n${endMarker}\n`
            : `${endMarker}\n${startMarker}\n`;
      expect(() =>
        materializeAssetArtifacts(schema.ddl, schema.snapshot, invalid)
      ).toThrow();
    }
  );

  it("preserves all bytes outside the deployment contract markers", () => {
    const prefix = "-- keep unrelated prefix\r\nSELECT 'outside';\r\n";
    const suffix = "\r\n-- keep trailing contract\r\nSELECT 2;\r\n";
    const existing = `${prefix}${startMarker}\nold generated segment\n${endMarker}${suffix}`;
    const result = materializeAssetArtifacts(
      schema.ddl,
      schema.snapshot,
      existing
    ).get(workerPath);
    expect(result?.startsWith(prefix + startMarker)).toBe(true);
    expect(result?.endsWith(endMarker + suffix)).toBe(true);
    expect(result).not.toContain("old generated segment");
  });

  it.each(["extra", "missing"] as const)(
    "rejects %s snapshot tables",
    (kind) => {
      const snapshot = modifiedSnapshot((value) => {
        const tables = object(value.tables);
        if (kind === "extra")
          tables.unrelated_table = structuredClone(Object.values(tables)[0]);
        else delete tables[assetTableNames[0]];
      });
      expect(() =>
        materializeAssetArtifacts(schema.ddl, snapshot, workerContract)
      ).toThrow();
    }
  );

  it("rejects database defaults rather than silently weakening the contract", () => {
    const snapshot = modifiedSnapshot((value) => {
      object(Object.values(object(firstTable(value).columns))[0]).default = 0;
    });
    expect(() =>
      materializeAssetArtifacts(schema.ddl, snapshot, workerContract)
    ).toThrow();
  });

  it("rejects unknown generated SQL instead of discarding it", () => {
    expect(() =>
      materializeAssetArtifacts(
        `${schema.ddl}\n--> statement-breakpoint\nDROP TABLE unrelated;`,
        schema.snapshot,
        workerContract
      )
    ).toThrow();
  });

  it("rejects expression indexes not supported by the schema contract", () => {
    const snapshot = modifiedSnapshot((value) => {
      const table = Object.values(object(value.tables))
        .map(object)
        .find((item) => Object.keys(object(item.indexes)).length > 0);
      if (!table) throw new Error("No index fixture");
      object(Object.values(object(table.indexes))[0]).columns = [
        { expression: "lower(name)", isExpression: true },
      ];
    });
    expect(() =>
      materializeAssetArtifacts(schema.ddl, snapshot, workerContract)
    ).toThrow();
  });

  it("rejects unsupported snapshot versions", () => {
    const snapshot = modifiedSnapshot((value) => {
      value.version = "999";
    });
    expect(() =>
      materializeAssetArtifacts(schema.ddl, snapshot, workerContract)
    ).toThrow();
  });

  it("rejects composite primary keys that the current contract cannot verify", () => {
    const snapshot = modifiedSnapshot((value) => {
      firstTable(value).compositePrimaryKeys = {
        unexpected: { name: "unexpected", columns: ["tenant_id", "id"] },
      };
    });
    expect(() =>
      materializeAssetArtifacts(schema.ddl, snapshot, workerContract)
    ).toThrow();
  });

  it("rejects check literals that cannot safely use the supported normalization", () => {
    const snapshot = modifiedSnapshot((value) => {
      const table = Object.values(object(value.tables))
        .map(object)
        .find((item) => Object.keys(object(item.checkConstraints)).length > 0);
      if (!table) throw new Error("No check fixture");
      object(Object.values(object(table.checkConstraints))[0]).value =
        "name <> 'contains whitespace'";
    });
    expect(() =>
      materializeAssetArtifacts(schema.ddl, snapshot, workerContract)
    ).toThrow();
  });

  it("runs the default check from a different cwd with spaces and preserves migration hashes", () => {
    const cwd = fixtureRoot();
    const before = contents(serverRoot);
    const timestamps = modificationTimes(serverRoot);
    const history = historyHashes(serverRoot);
    const tsx = createRequire(import.meta.url).resolve("tsx/cli");
    const result = spawnSync(
      process.execPath,
      [tsx, join(serverRoot, "scripts/generate-enterprise-assets.ts")],
      {
        cwd,
        encoding: "utf8",
        timeout: 30_000,
      }
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(contents(serverRoot)).toEqual(before);
    expect(modificationTimes(serverRoot)).toEqual(timestamps);
    expect(historyHashes(serverRoot)).toEqual(history);
  }, 35_000);
});
