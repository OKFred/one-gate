import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

import { getEnv } from "@/utils/env";

const dbFile = getEnv("DB_FILE_NAME") || ":memory:";
const client = createClient({ url: dbFile });
const db = drizzle<{}>({
  client,
  // logger: true,
});

export { db };
export default db;
