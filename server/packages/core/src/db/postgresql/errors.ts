type PostgresError = { readonly code: string; readonly constraint?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Drivers wrap causes; classify SQLSTATE without exposing SQL or parameter values. */
export function getPostgresError(error: unknown): PostgresError | undefined {
  let current = error;
  for (let depth = 0; depth < 6 && isRecord(current); depth++) {
    const code = current.code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      const constraint = current.constraint;
      return {
        code,
        ...(typeof constraint === "string" ? { constraint } : {}),
      };
    }
    current = current.cause;
  }
  return undefined;
}

export function isPostgresUniqueConflict(
  error: unknown,
  constraint?: string
): boolean {
  const parsed = getPostgresError(error);
  return (
    parsed?.code === "23505" &&
    (constraint === undefined || parsed.constraint === constraint)
  );
}
