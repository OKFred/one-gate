import { getEnv } from "@/utils/env";
import { drizzle as drizzleLibsql, type LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { drizzle as drizzleD1, type DrizzleD1Database } from "drizzle-orm/d1";

/**
 * 定义统一的数据库类型
 * 使用交叉类型 (Intersection Type) 合并 LibSQL 和 D1 的 API 声明，
 * 解决联合类型在处理具有重载的方法（如 .select()）以及驱动特有方法（如 .batch()）时的类型推导问题。
 */
export type AppDatabase = LibSQLDatabase<any> & DrizzleD1Database<any>;

/**
 * 从 drizzle-orm/d1 的参数中提取 D1 绑定类型
 */
type D1Binding = Parameters<typeof drizzleD1>[0];

let _db: AppDatabase | null = null;
let _d1Binding: D1Binding | null = null;

/**
 * Initialize the database for Cloudflare D1.
 * This is typically called from the Hono middleware.
 */
export function setD1Binding(d1Binding: D1Binding) {
  if (!d1Binding) return;
  _d1Binding = d1Binding;
  _db = drizzleD1(d1Binding);
}

/**
 * Get the database instance, initializing it if necessary.
 */
export function getDb(): AppDatabase {
  if (_db) return _db;

  // Check if we have a stored D1 binding
  if (_d1Binding) {
    _db = drizzleD1(_d1Binding);
    return _db;
  }

  // Fallback to LibSQL (Local development / Node.js)
  try {
    const fileName = getEnv("DB_FILE_NAME");
    const url = fileName || ":memory:";
    const client = createClient({ url });
    _db = drizzleLibsql(client);
    return _db;
  } catch (e) {
    // If in Worker, we might expect this to fail if called before middleware
    if (typeof process === "undefined" || !process.env) {
      console.warn(
        "getDb() called before D1 binding was set in Worker environment. Check middleware initialization."
      );
    }
    console.error("Failed to initialize LibSQL database:", e);
    throw e;
  }
}

/**
 * Proxy object that lazily resolves to the active database instance.
 * This allows importing 'db' at the top level of other files.
 */
export const db = new Proxy({} as AppDatabase, {
  get(_, prop) {
    const target = getDb();
    const value = (target as any)[prop];
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export default db;
