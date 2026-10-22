import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  generateFullDdl,
  parseGeneratedDdl,
  runDdlGeneratorCli,
  type DdlGenerationInput,
} from "../../../scripts/generate-ddl";

const roots: string[] = [];
const histories = [
  "packages/core/src/db/migrations/20260810_01_history.sql",
  "packages/core/src/db/migrations/meta/snapshot.json",
  "apps/server/d1-migrations/0015_role_soft_delete.sql",
  "apps/server/d1-migrations/0016_enterprise_assets.sql",
  "apps/server/d1-migrations/0017_enterprise_asset_metadata.sql",
  "apps/server/postgresql-migrations/0001_core_enterprise.sql",
] as const;
function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "one-gate-ddl-test-"));
  roots.push(root);
  for (const file of [
    ...histories,
    "temp-migrations/user-owned.txt",
    "packages/core/src/db/sql/enterprise/enterprise_sample.sql",
    "packages/core/src/db/sql/admin/admin_sample.sql",
    "packages/core/src/db/sql/personal/personal_sample.sql",
  ]) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `original bytes: ${file}\n`);
  }
  return root;
}
function historyHashes(root: string): string[] {
  return histories.map((file) =>
    createHash("sha256")
      .update(readFileSync(join(root, file)))
      .digest("hex")
  );
}
function ddlContents(root: string): string[] {
  return ["enterprise", "admin", "personal"].map((domain) =>
    readFileSync(
      join(root, "packages/core/src/db/sql", domain, `${domain}_sample.sql`),
      "utf8"
    )
  );
}
function generated(input: DdlGenerationInput): void {
  mkdirSync(input.outputDirectory);
  writeFileSync(
    join(input.outputDirectory, "0000_fresh.sql"),
    `CREATE TABLE \`${input.domain}_sample\` (id integer PRIMARY KEY, message text DEFAULT 'a; b');\n--> statement-breakpoint\nCREATE UNIQUE INDEX \`${input.domain}_sample_idx\` ON \`${input.domain}_sample\` (message);\n`
  );
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    const target = resolve(root);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith("one-gate-ddl-test-")
    )
      throw new Error(
        "Refusing fixture cleanup outside its owned temporary directory"
      );
    rmSync(target, { recursive: true, force: true });
  }
});

describe("safe full SQLite DDL generation", () => {
  it("publishes all domains and preserves every historical byte and shared temporary directory", async () => {
    const root = fixtureRoot();
    const history = historyHashes(root);
    const temporaries: string[] = [];
    const files = await generateFullDdl({
      projectRoot: root,
      generate(input) {
        temporaries.push(dirname(input.outputDirectory));
        generated(input);
      },
    });
    expect(files).toHaveLength(3);
    for (const ddl of ddlContents(root)) {
      expect(ddl).toContain("CREATE TABLE IF NOT EXISTS");
      expect(ddl).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
      expect(ddl).toContain("DEFAULT 'a; b'");
    }
    expect(historyHashes(root)).toEqual(history);
    expect(
      readFileSync(join(root, "temp-migrations/user-owned.txt"), "utf8")
    ).toContain("original bytes");
    expect(new Set(temporaries).size).toBe(1);
    expect(existsSync(temporaries[0])).toBe(false);
  });
  it("does not publish an earlier domain when a later generator fails", async () => {
    const root = fixtureRoot();
    const before = ddlContents(root);
    const history = historyHashes(root);
    let temporary: string | undefined;
    await expect(
      generateFullDdl({
        projectRoot: root,
        generate(input) {
          temporary = dirname(input.outputDirectory);
          if (input.domain === "admin")
            throw new Error("synthetic generator failure");
          generated(input);
        },
      })
    ).rejects.toThrow("synthetic generator failure");
    expect(ddlContents(root)).toEqual(before);
    expect(historyHashes(root)).toEqual(history);
    expect(temporary).toBeDefined();
    expect(existsSync(temporary!)).toBe(false);
  });
  it("treats successful generators with missing or incomplete output as failures", async () => {
    for (const mode of ["missing", "empty", "invalid"] as const) {
      const root = fixtureRoot();
      const before = ddlContents(root);
      await expect(
        generateFullDdl({
          projectRoot: root,
          generate(input) {
            if (input.domain !== "personal") return generated(input);
            if (mode === "missing") return;
            mkdirSync(input.outputDirectory);
            if (mode === "invalid")
              writeFileSync(
                join(input.outputDirectory, "0000.sql"),
                "ALTER TABLE enterprise_sample ADD COLUMN value text;"
              );
          },
        })
      ).rejects.toThrow();
      expect(ddlContents(root)).toEqual(before);
    }
  });
  it("allocates independent temporary roots for simultaneous invocations", async () => {
    const first = fixtureRoot();
    const second = fixtureRoot();
    const temporaryRoots = new Set<string>();
    await Promise.all(
      [first, second].map((root) =>
        generateFullDdl({
          projectRoot: root,
          async generate(input) {
            temporaryRoots.add(dirname(input.outputDirectory));
            await Promise.resolve();
            generated(input);
          },
        })
      )
    );
    expect(temporaryRoots.size).toBe(2);
    for (const root of temporaryRoots) expect(existsSync(root)).toBe(false);
  });

  it("rejects a linked output ancestor before publishing any domain", async () => {
    const root = fixtureRoot();
    const outside = fixtureRoot();
    const adminDirectory = join(root, "packages/core/src/db/sql/admin");
    const before = ddlContents(root);
    renameSync(adminDirectory, `${adminDirectory}.original`);
    symlinkSync(
      join(outside, "absent-directory"),
      adminDirectory,
      process.platform === "win32" ? "junction" : "dir"
    );
    await expect(
      generateFullDdl({ projectRoot: root, generate: generated })
    ).rejects.toThrow("links");
    expect(
      readFileSync(
        join(root, "packages/core/src/db/sql/enterprise/enterprise_sample.sql"),
        "utf8"
      )
    ).toBe(before[0]);
    expect(existsSync(join(outside, "absent-directory"))).toBe(false);
  });
  it.each([
    "migration",
    "--migration",
    "incremental",
    "--incremental",
    "--migration=true",
    "--unknown",
  ])("rejects %s before generating or changing any file", async (argument) => {
    const root = fixtureRoot();
    const before = ddlContents(root);
    const history = historyHashes(root);
    const generate = vi.fn(generated);
    const log = vi.fn();
    const error = vi.fn();
    expect(
      await runDdlGeneratorCli([argument], {
        projectRoot: root,
        generate,
        log,
        error,
      })
    ).toBe(1);
    expect(generate).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("docs/database-migrations.md")
    );
    expect(ddlContents(root)).toEqual(before);
    expect(historyHashes(root)).toEqual(history);
  });
  it("reports completion only after every domain was published", async () => {
    const root = fixtureRoot();
    const log = vi.fn();
    const error = vi.fn();
    expect(
      await runDdlGeneratorCli([], {
        projectRoot: root,
        generate: generated,
        log,
        error,
      })
    ).toBe(0);
    expect(error).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("Generated 3"));
    const failedRoot = fixtureRoot();
    log.mockClear();
    expect(
      await runDdlGeneratorCli([], {
        projectRoot: failedRoot,
        generate: () => {
          throw new Error("synthetic");
        },
        log,
        error,
      })
    ).toBe(1);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("did not complete")
    );
  });

  it("runs the installed Drizzle generator against isolated synthetic schemas", async () => {
    const root = fixtureRoot();
    const history = historyHashes(root);
    const serverRoot = fileURLToPath(new URL("../../../", import.meta.url));
    symlinkSync(
      join(serverRoot, "node_modules"),
      join(root, "node_modules"),
      process.platform === "win32" ? "junction" : "dir"
    );
    for (const domain of ["enterprise", "admin", "personal"]) {
      const directory = join(root, "packages", domain, "src");
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, "model.ts"),
        `import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";\nexport const sample = sqliteTable("${domain}_sample", { id: integer("id").primaryKey(), message: text("message").default("a; b") });\n`
      );
    }
    expect(await generateFullDdl({ projectRoot: root })).toHaveLength(3);
    for (const ddl of ddlContents(root)) {
      expect(ddl).toContain("CREATE TABLE IF NOT EXISTS");
      expect(ddl).toContain("DEFAULT 'a; b'");
    }
    expect(historyHashes(root)).toEqual(history);
  }, 30_000);
  it("returns a real nonzero CLI exit for legacy arguments without touching repository history", () => {
    const root = fileURLToPath(new URL("../../../", import.meta.url));
    const historyRoot = join(root, "packages/core/src/db/migrations");
    const files = readdirSync(historyRoot).filter((file) =>
      file.endsWith(".sql")
    );
    const before = files.map((file) =>
      readFileSync(join(historyRoot, file), "utf8")
    );
    const require = createRequire(import.meta.url);
    const cli = spawnSync(
      process.execPath,
      [
        "--import",
        pathToFileURL(require.resolve("tsx/esm")).href,
        join(root, "scripts/generate-ddl.ts"),
        "--migration",
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 15_000,
        shell: false,
        windowsHide: true,
      }
    );
    expect(cli.error).toBeUndefined();
    expect(cli.status).toBe(1);
    expect(cli.stderr).toContain("docs/database-migrations.md");
    expect(cli.stdout).not.toContain("Generated");
    expect(
      files.map((file) => readFileSync(join(historyRoot, file), "utf8"))
    ).toEqual(before);
  });
  it("parses quoted semicolons and comments and rejects unsafe or incomplete DDL", () => {
    const result = parseGeneratedDdl(
      "-- header; comment\nCREATE TABLE `sample` (id integer, value text DEFAULT 'it''s; ok'); /* block; comment */ CREATE INDEX ix ON `sample`(value);"
    );
    expect(result.get("sample")).toContain("'it''s; ok'");
    expect(result.get("sample")).toContain("CREATE INDEX IF NOT EXISTS");
    expect(() =>
      parseGeneratedDdl('CREATE TABLE "../../escaped" (id integer);')
    ).toThrow("Unsafe");
    expect(() =>
      parseGeneratedDdl(
        "CREATE TABLE sample(id integer DEFAULT 'unterminated); "
      )
    ).toThrow("Incomplete");
    expect(() => parseGeneratedDdl("CREATE INDEX ix ON sample(id);")).toThrow(
      "missing table"
    );
  });
});
