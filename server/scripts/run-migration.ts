import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "../src/db/index.js";

// Load environment variables manually if not using --env-file
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlPath = path.resolve(
  __dirname,
  "../src/db/migrations/202607050000_migrate_menu_paths.sql"
);

async function main() {
  console.log("⌛ Starting migration to update menu paths...");

  if (!fs.existsSync(sqlPath)) {
    console.error("❌ Migration SQL file not found at:", sqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, "utf8");
  const statements = sqlContent
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    console.log(`Executing SQL: ${statement}`);
    await db.run(statement);
  }

  console.log("✅ Migration completed successfully!");
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
