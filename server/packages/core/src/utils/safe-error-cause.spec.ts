import { describe, expect, it, vi } from "vitest";
import { classifySafeErrorCause } from "./safe-error-cause.js";

describe("safe error cause classification", () => {
  it.each([
    [new Error("Network connection lost."), "NETWORK_CONNECTION_LOST"],
    [
      new Error("D1_ERROR: Network connection lost."),
      "NETWORK_CONNECTION_LOST",
    ],
    [new Error("D1_ERROR: private query details"), "D1_ERROR"],
    [new Error("D1_EXEC_ERROR: private SQL parameters"), "D1_EXEC_ERROR"],
    [new Error("D1_TYPE_ERROR: private field value"), "D1_TYPE_ERROR"],
    [new Error("D1_COLUMN_NOTFOUND: private field"), "D1_COLUMN_NOTFOUND"],
    [
      { code: "08006", message: "private database url" },
      "POSTGRES_CONNECTION_ERROR",
    ],
    [{ code: "53300" }, "POSTGRES_CONNECTION_LIMIT"],
    [{ code: "57014" }, "POSTGRES_QUERY_CANCELLED"],
    [{ code: "40001" }, "POSTGRES_SERIALIZATION_FAILURE"],
    [{ code: "40P01" }, "POSTGRES_DEADLOCK"],
    [
      { code: "23503", detail: "private identifier" },
      "POSTGRES_CONSTRAINT_VIOLATION",
    ],
    [{ code: "SQLITE_BUSY" }, "SQLITE_BUSY"],
    [{ code: "SQLITE_CONSTRAINT" }, "SQLITE_CONSTRAINT"],
    [
      new Error("Soft-delete cleanup failed; retry on next tick"),
      "SOFT_DELETE_CLEANUP_FAILED",
    ],
  ])("returns a fixed category for %j", (error, expected) => {
    expect(classifySafeErrorCause(error)).toBe(expected);
  });

  it.each([
    ["SQLITE_BUSY_RECOVERY", "SQLITE_BUSY"],
    ["SQLITE_BUSY_SNAPSHOT", "SQLITE_BUSY"],
    ["SQLITE_BUSY_TIMEOUT", "SQLITE_BUSY"],
    ["SQLITE_CONSTRAINT_CHECK", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_COMMITHOOK", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_DATATYPE", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_FOREIGNKEY", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_FUNCTION", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_NOTNULL", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_PINNED", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_PRIMARYKEY", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_ROWID", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_TRIGGER", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_UNIQUE", "SQLITE_CONSTRAINT"],
    ["SQLITE_CONSTRAINT_VTAB", "SQLITE_CONSTRAINT"],
  ])("recognizes the explicit SQLite extension %s", (code, expected) => {
    expect(classifySafeErrorCause({ code })).toBe(expected);
    const nested = new Error("Failed query: private SQL and parameters", {
      cause: {
        name: "LibsqlError",
        code,
        message: "private table and column",
        cause: { name: "SqliteError", code, rawCode: 19 },
      },
    });
    expect(classifySafeErrorCause(nested)).toBe(expected);
  });

  it("finds a specific nested cause without classifying SQL parameter text", () => {
    const error = new Error(
      "Failed query: insert secret values ('D1_ERROR: Network connection lost.')",
      { cause: new Error("Network connection lost.") }
    );
    expect(classifySafeErrorCause(error)).toBe("NETWORK_CONNECTION_LOST");
    expect(classifySafeErrorCause(new Error(error.message))).toBe("UNKNOWN");
    expect(
      classifySafeErrorCause(
        new Error("D1_ERROR: wrapper", {
          cause: new Error("Network connection lost."),
        })
      )
    ).toBe("NETWORK_CONNECTION_LOST");
  });

  it.each([
    "Network connection lost.",
    null,
    undefined,
    42,
    { code: "SECRET_TOKEN_VALUE", message: "private text" },
    new Error("Network connection lost. password=private"),
    new Error("prefix D1_ERROR: private"),
    new Error("D1_ERROR_WITH_A_SECRET"),
    { code: "SQLITE_BUSY_UNKNOWN_EXTENSION" },
    { code: "SQLITE_CONSTRAINT_UNKNOWN_EXTENSION" },
    { code: "SQLITE_CONSTRAINT_UNIQUE_private_value" },
    { code: "SQLITE_BUSY_TIMEOUT private_connection" },
    new Error("SQLITE_CONSTRAINT_UNIQUE: private table"),
    new Error("Failed query: private SQL", {
      cause: { name: "LibsqlError", code: "SQLITE_CONSTRAINT_PRIVATE_VALUE" },
    }),
  ])("keeps unknown values private: %j", (error) => {
    expect(classifySafeErrorCause(error)).toBe("UNKNOWN");
  });

  it("never invokes property getters or string conversion", () => {
    const getter = vi.fn(() => {
      throw new Error("private getter error");
    });
    const error = Object.defineProperties(
      {},
      {
        code: { get: getter },
        message: { get: getter },
        cause: { get: getter },
        toJSON: { get: getter },
        toString: { get: getter },
      }
    );
    expect(classifySafeErrorCause(error)).toBe("UNKNOWN");
    expect(getter).not.toHaveBeenCalled();
    expect(
      classifySafeErrorCause(
        new Proxy(
          {},
          {
            getOwnPropertyDescriptor() {
              throw new Error("private proxy error");
            },
          }
        )
      )
    ).toBe("UNKNOWN");
  });

  it("bounds traversal and terminates cyclic causes", () => {
    const cyclic: { cause?: unknown } = {};
    cyclic.cause = cyclic;
    expect(classifySafeErrorCause(cyclic)).toBe("UNKNOWN");
    let deep: unknown = new Error("Network connection lost.");
    for (let i = 0; i < 6; i += 1) deep = { cause: deep };
    expect(classifySafeErrorCause(deep)).toBe("UNKNOWN");
  });
});
