import { getEnv } from "@/utils/env";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";

// We use any here because the underlying database type changes between D1 and LibSQL
let _db: any = null;

/**
 * Initialize the database for Cloudflare D1.
 * This is typically called from the Hono middleware.
 */
export function setD1Binding(d1Binding: any) {
  if (!d1Binding) return;
  // Store it so getDb can re-initialize if needed
  if (typeof getEnv === "function") {
    (getEnv as any).__d1 = d1Binding;
  }
  _db = drizzleD1(d1Binding);
}

/**
 * Get the database instance, initializing it if necessary.
 */
export function getDb(): any {
  if (_db) return _db;

  // Check if we have a stored D1 binding (from setD1Binding or env utility)
  const d1Binding = (getEnv as any)?.__d1;
  if (d1Binding) {
    _db = drizzleD1(d1Binding);
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
export const db = new Proxy({} as any, {
  get(_, prop) {
    const target = getDb();
    const value = target[prop];
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export default db;
