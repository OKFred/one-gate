/** Stable diagnostic categories; never return driver messages, SQL or parameters. */
export type SafeErrorCauseCode =
  | "NETWORK_CONNECTION_LOST"
  | "D1_ERROR"
  | "D1_EXEC_ERROR"
  | "D1_TYPE_ERROR"
  | "D1_COLUMN_NOTFOUND"
  | "POSTGRES_CONNECTION_ERROR"
  | "POSTGRES_CONNECTION_LIMIT"
  | "POSTGRES_QUERY_CANCELLED"
  | "POSTGRES_SERIALIZATION_FAILURE"
  | "POSTGRES_DEADLOCK"
  | "POSTGRES_CONSTRAINT_VIOLATION"
  | "SQLITE_BUSY"
  | "SQLITE_CONSTRAINT"
  | "SOFT_DELETE_CLEANUP_FAILED"
  | "UNKNOWN";

const codeCategories = new Map<string, SafeErrorCauseCode>([
  ["08000", "POSTGRES_CONNECTION_ERROR"],
  ["08001", "POSTGRES_CONNECTION_ERROR"],
  ["08003", "POSTGRES_CONNECTION_ERROR"],
  ["08004", "POSTGRES_CONNECTION_ERROR"],
  ["08006", "POSTGRES_CONNECTION_ERROR"],
  ["08007", "POSTGRES_CONNECTION_ERROR"],
  ["08P01", "POSTGRES_CONNECTION_ERROR"],
  ["57P01", "POSTGRES_CONNECTION_ERROR"],
  ["53300", "POSTGRES_CONNECTION_LIMIT"],
  ["57014", "POSTGRES_QUERY_CANCELLED"],
  ["40001", "POSTGRES_SERIALIZATION_FAILURE"],
  ["40P01", "POSTGRES_DEADLOCK"],
  ["23502", "POSTGRES_CONSTRAINT_VIOLATION"],
  ["23503", "POSTGRES_CONSTRAINT_VIOLATION"],
  ["23505", "POSTGRES_CONSTRAINT_VIOLATION"],
  ["23514", "POSTGRES_CONSTRAINT_VIOLATION"],
  ["SQLITE_BUSY", "SQLITE_BUSY"],
  ["SQLITE_BUSY_RECOVERY", "SQLITE_BUSY"],
  ["SQLITE_BUSY_SNAPSHOT", "SQLITE_BUSY"],
  ["SQLITE_BUSY_TIMEOUT", "SQLITE_BUSY"],
  ["SQLITE_CONSTRAINT", "SQLITE_CONSTRAINT"],
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
]);

const d1Prefixes = [
  "D1_ERROR",
  "D1_EXEC_ERROR",
  "D1_TYPE_ERROR",
  "D1_COLUMN_NOTFOUND",
] as const;

/** Read data properties without executing getters or serializing unknown values. */
function ownDataProperty(value: object, key: string): unknown {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

/** Inspect a bounded cause chain and return only a fixed, non-sensitive category. */
export function classifySafeErrorCause(error: unknown): SafeErrorCauseCode {
  let current = error;
  let fallback: SafeErrorCauseCode = "UNKNOWN";
  const visited = new Set<object>();
  for (let depth = 0; depth < 6; depth += 1) {
    if (typeof current !== "object" || current === null || visited.has(current))
      break;
    visited.add(current);
    const code = ownDataProperty(current, "code");
    if (typeof code === "string") {
      const category = codeCategories.get(code);
      if (category) return category;
    }
    const message = ownDataProperty(current, "message");
    if (typeof message === "string") {
      if (
        message === "Network connection lost." ||
        message === "D1_ERROR: Network connection lost."
      ) {
        return "NETWORK_CONNECTION_LOST";
      }
      if (message === "Soft-delete cleanup failed; retry on next tick") {
        fallback = "SOFT_DELETE_CLEANUP_FAILED";
      }
      for (const prefix of d1Prefixes) {
        if (message === prefix || message.startsWith(prefix + ": ")) {
          fallback = prefix;
          break;
        }
      }
    }
    current = ownDataProperty(current, "cause");
  }
  return fallback;
}
