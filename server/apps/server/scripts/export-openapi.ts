import { writeFile } from "node:fs/promises";
import path from "node:path";

import {
  InMemoryTotpAttemptCoordinator,
  createTotpGateCenter,
} from "@hodor/admin/system/auth/totp-gate/index.js";
import { setEnv } from "@hodor/core/utils/env.js";

import createApp from "../src/index.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const outFlagIndex = args.indexOf("--output");
  const output =
    outFlagIndex >= 0
      ? args[outFlagIndex + 1]
      : args.find((a) => !a.startsWith("-"));
  if (!output) throw new Error("OpenAPI output path is required");

  setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "development" });
  const coordinator = new InMemoryTotpAttemptCoordinator();
  const app = createApp({
    resolveTotpGateCenter: () => createTotpGateCenter(coordinator),
  });
  const response = await app.request("/doc.json");
  if (!response.ok) {
    throw new Error(`OpenAPI export failed with HTTP ${response.status}`);
  }

  const outputPath = path.resolve(output);
  await writeFile(outputPath, await response.text(), "utf8");
  console.log(`OpenAPI document exported to ${outputPath}`);
}

await main();
