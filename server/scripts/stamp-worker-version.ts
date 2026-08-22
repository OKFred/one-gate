import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_ENTRY = /("VERSION"\s*:\s*")[^"]*(")/;

export function buildDeploymentVersion(
  commitSha: string,
  now = new Date()
): string {
  const normalizedSha = commitSha.trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(normalizedSha)) {
    throw new Error("Worker version requires a 7-40 character Git SHA");
  }
  const timestamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  return `${timestamp}-${normalizedSha.slice(0, 8)}`;
}

/** 保留原函数名，兼容已有调用方。 */
export const buildWorkerVersion = buildDeploymentVersion;

/** 生成供 Pages 发布的公开版本文件。 */
export function buildFrontendVersionSource(version: string): string {
  return `${JSON.stringify({ version })}\n`;
}

export function replaceWorkerVersion(
  configSource: string,
  version: string
): string {
  if (!VERSION_ENTRY.test(configSource)) {
    throw new Error('Worker config is missing the "VERSION" variable');
  }
  return configSource.replace(VERSION_ENTRY, `$1${version}$2`);
}

export async function stampWorkerVersion(
  configPath: string,
  commitSha: string,
  now = new Date()
): Promise<string> {
  const version = buildWorkerVersion(commitSha, now);
  const source = await readFile(configPath, "utf8");
  await writeFile(configPath, replaceWorkerVersion(source, version), "utf8");
  return version;
}

/** 使用同一部署版本盖章 Pages 静态版本文件。 */
export async function stampFrontendVersion(
  versionPath: string,
  commitSha: string,
  now = new Date()
): Promise<string> {
  const version = buildDeploymentVersion(commitSha, now);
  await writeFile(versionPath, buildFrontendVersionSource(version), "utf8");
  return version;
}

async function main() {
  const commitSha =
    process.argv[2] ||
    process.env.DEPLOYMENT_COMMIT_SHA ||
    process.env.WORKER_COMMIT_SHA ||
    "";
  const configPath = resolve(process.argv[3] || "apps/server/wrangler.jsonc");
  const frontendVersionPath = resolve(
    process.argv[4] || "../platform/public/version.json"
  );
  const now = new Date();
  const workerVersion = await stampWorkerVersion(configPath, commitSha, now);
  const frontendVersion = await stampFrontendVersion(
    frontendVersionPath,
    commitSha,
    now
  );
  if (workerVersion !== frontendVersion) {
    throw new Error("Worker and Pages deployment versions diverged");
  }
  console.log(`Stamped Worker and Pages VERSION=${workerVersion}`);
}

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (entrypoint === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
