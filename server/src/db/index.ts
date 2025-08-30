import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const dbFile = process.env.DB_FILE_NAME || ":memory:";
const client = createClient({ url: dbFile });
const db = drizzle<{}>({
  client,
  // logger: true,
});

export { db };
export default db;
