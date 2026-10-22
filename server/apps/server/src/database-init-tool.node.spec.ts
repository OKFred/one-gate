import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  baseTableInit: vi.fn(),
  initDatabase: vi.fn(),
  execute: vi.fn(),
  run: vi.fn(),
}));
vi.mock("@hodor/core/db/utils/schema", () => ({
  baseTableInit: mocks.baseTableInit,
}));
vi.mock("@hodor/core/db/init", () => ({ initDatabase: mocks.initDatabase }));
vi.mock("@hodor/core/db/index", () => ({ default: { run: mocks.run } }));
vi.mock("node:child_process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:child_process")>()),
  execFileSync: mocks.execute,
}));

import {
  parseInitArgs,
  runDatabaseInit,
} from "../../../packages/core/src/db/initTable";

const serverRoot = fileURLToPath(new URL("../../../", import.meta.url));
const directories: string[] = [];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0)) {
    const absolute = resolve(directory);
    if (
      dirname(absolute) !== resolve(tmpdir()) ||
      !basename(absolute).startsWith("one-gate-init-tool-")
    )
      throw new Error("Unsafe fixture cleanup");
    rmSync(absolute, { recursive: true, force: true });
  }
});

describe("database initialization and migration separation", () => {
  it.each([
    ["node", "migration"],
    ["--node", "--migration"],
  ])(
    "rejects legacy Node replay before environment loading, DDL and seeds: %j",
    async (...args) => {
      await expect(
        runDatabaseInit([...args, "--env=does-not-exist.env"])
      ).rejects.toThrow("db:init node migration is retired");
      expect(mocks.baseTableInit).not.toHaveBeenCalled();
      expect(mocks.initDatabase).not.toHaveBeenCalled();
      expect(mocks.execute).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["node", "worker"],
    ["worker", "local", "remote"],
    ["node", "remote"],
    ["migration"],
    ["worker", "--typo"],
    ["node", "--env="],
    ["node", "--env=a.env", "--env=b.env"],
  ])("rejects ambiguous or invalid targets: %j", (...args) => {
    expect(() => parseInitArgs(args)).toThrow();
    expect(mocks.baseTableInit).not.toHaveBeenCalled();
    expect(mocks.initDatabase).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("retains environment file names containing equals signs", () => {
    expect(parseInitArgs(["node", "--env=./config/a=b.env"]).envFile).toBe(
      "./config/a=b.env"
    );
    expect(parseInitArgs(["node", "--ENV=./config/a=b.env"]).envFile).toBe(
      "./config/a=b.env"
    );
  });

  it("shows help without accessing the database", async () => {
    await runDatabaseInit([]);
    await runDatabaseInit(["help"]);
    expect(mocks.baseTableInit).not.toHaveBeenCalled();
    expect(mocks.initDatabase).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it.each(["local", "remote"])(
    "keeps Worker %s migration on the official ledger with no seed synchronization",
    async (target) => {
      await runDatabaseInit(["worker", target, "migration"]);
      expect(mocks.execute).toHaveBeenCalledExactlyOnceWith(
        process.platform === "win32" ? "pnpm.cmd" : "pnpm",
        [
          "exec",
          "wrangler",
          "d1",
          "migrations",
          "apply",
          "hodor_db",
          `--${target}`,
        ],
        { cwd: join(serverRoot, "apps/server"), stdio: "inherit" }
      );
      expect(mocks.baseTableInit).not.toHaveBeenCalled();
      expect(mocks.initDatabase).not.toHaveBeenCalled();
    }
  );

  it("stops on the first DDL failure without synchronizing seeds", async () => {
    mocks.baseTableInit.mockRejectedValueOnce(new Error("DDL failed"));
    await expect(runDatabaseInit(["node"])).rejects.toThrow("DDL failed");
    expect(mocks.baseTableInit).toHaveBeenCalledTimes(1);
    expect(mocks.initDatabase).not.toHaveBeenCalled();
  });

  it("initializes fresh tables strictly and seeds only after all succeed", async () => {
    mocks.initDatabase.mockImplementation(() => {
      expect(mocks.baseTableInit.mock.calls.length).toBeGreaterThan(0);
      expect(
        mocks.baseTableInit.mock.calls.every(
          ([, , options]) => options.failOnError
        )
      ).toBe(true);
    });
    await runDatabaseInit(["node"]);
    expect(mocks.initDatabase).toHaveBeenCalledTimes(1);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("propagates seed failures", async () => {
    mocks.initDatabase.mockRejectedValueOnce(new Error("seed failed"));
    await expect(runDatabaseInit(["node"])).rejects.toThrow("seed failed");
  });

  it("the actual CLI exits nonzero without creating a database for retired arguments", () => {
    const directory = mkdtempSync(join(tmpdir(), "one-gate-init-tool-"));
    directories.push(directory);
    const database = join(directory, "must-not-be-created.db");
    const result = spawnSync(
      process.execPath,
      [
        createRequire(import.meta.url).resolve("tsx/cli"),
        join(serverRoot, "packages/core/src/db/initTable.ts"),
        "node",
        "migration",
        "--env=does-not-exist.env",
      ],
      {
        cwd: directory,
        encoding: "utf8",
        timeout: 10_000,
        env: { ...process.env, DB_FILE_NAME: pathToFileURL(database).href },
      }
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("db:init node migration is retired");
    expect(result.stderr).not.toContain("Environment file was not found");
    expect(existsSync(database)).toBe(false);
  });

  it("strict schema initialization propagates database errors and missing DDL", async () => {
    const { baseTableInit } = await vi.importActual<
      typeof import("@hodor/core/db/utils/schema")
    >("@hodor/core/db/utils/schema");
    mocks.run.mockRejectedValue(new Error("database write failed"));
    await expect(
      baseTableInit("system_department", undefined, { failOnError: true })
    ).rejects.toThrow("database write failed");
    await expect(
      baseTableInit("missing_fixture_table", undefined, { failOnError: true })
    ).rejects.toThrow("DDL file missing");
    await expect(baseTableInit("system_department")).resolves.toBeUndefined();
  });
});
