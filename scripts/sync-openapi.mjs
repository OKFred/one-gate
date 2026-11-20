import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OPENAPI_OUT = path.join(
  REPO_ROOT,
  "platform/packages/ui/src/types/openapi.d.ts",
);
const TMP_JSON = path.join(os.tmpdir(), `hodor-openapi-${process.pid}.json`);
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  console.log("1/2 离线导出后端 OpenAPI JSON...");
  execFileSync(
    PNPM,
    ["--filter", "@hodor/server", "run", "openapi:export", "--", TMP_JSON],
    { cwd: REPO_ROOT, stdio: "inherit", shell: process.platform === "win32" },
  );

  console.log("2/2 生成前端 openapi.d.ts...");
  execFileSync(
    PNPM,
    [
      "--dir",
      "platform",
      "exec",
      "openapi-typescript",
      TMP_JSON,
      "-o",
      OPENAPI_OUT,
    ],
    { cwd: REPO_ROOT, stdio: "inherit", shell: process.platform === "win32" },
  );
  console.log(`✅ OpenAPI 类型已同步至 ${path.relative(REPO_ROOT, OPENAPI_OUT)}`);
} finally {
  if (fs.existsSync(TMP_JSON)) {
    fs.unlinkSync(TMP_JSON);
  }
}
