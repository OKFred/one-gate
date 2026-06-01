import { initDatabase } from "../src/db/init";
import process from "node:process";

async function run() {
  console.log("Starting DB seed locally...");
  const results = await initDatabase({ reset: false, skipSuper: true });
  console.log("Seed results:", JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error("Local seed failed:", err);
  process.exit(1);
});
