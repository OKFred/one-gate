import { sql, type SQL } from "drizzle-orm";

/** Unlike now(), this clock advances after lock waits inside a transaction. */
export function postgresNowMilliseconds() {
  return sql<number>`CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) AS BIGINT)`;
}

export function postgresSafeInteger(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed))
    throw new Error("PostgreSQL integer is outside the supported safe range");
  return parsed;
}

export function postgresJsonTextArray(value: SQL): SQL {
  return sql`CASE WHEN pg_input_is_valid(${value}, 'jsonb')
    THEN CASE WHEN jsonb_typeof(${value}::jsonb) = 'array' THEN ${value}::jsonb ELSE '[]'::jsonb END
    ELSE '[]'::jsonb END`;
}

export function postgresJsonArrayIsPositiveIds(value: SQL): SQL {
  const elements = sql`CASE WHEN jsonb_typeof(${value}) = 'array' THEN ${value} ELSE '[]'::jsonb END`;
  return sql`(jsonb_typeof(${value}) = 'array' AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(${elements}) AS checked_id(value)
    WHERE CASE WHEN jsonb_typeof(checked_id.value) = 'number'
      THEN (checked_id.value #>> '{}')::numeric < 1
        OR (checked_id.value #>> '{}')::numeric > ${Number.MAX_SAFE_INTEGER}
        OR MOD((checked_id.value #>> '{}')::numeric, 1) != 0
      ELSE TRUE END))`;
}
