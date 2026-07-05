import { sql } from "drizzle-orm";

/**
 * 获取当前UTC时间的SQL表达式（毫秒级时间戳）
 * 用于在数据库操作中设置时间戳字段（createTimeUtc、updateTimeUtc）
 *
 * @returns Drizzle ORM的SQL表达式对象
 *
 * @example
 * 用作默认值：
 * ```typescript
 * createTimeUtc: integer("create_time_utc")
 *   .notNull()
 *   .default(getCurrentTimestampUtcSql())
 * ```
 *
 * @example
 * 用于更新操作：
 * ```typescript
 * await db.update(userTable)
 *   .set({
 *     username: "newName",
 *     updateTimeUtc: getCurrentTimestampUtcSql()
 *   })
 *   .where(eq(userTable.id, id));
 * ```
 */
export function getCurrentTimestampUtcSql() {
  return sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`;
}
