import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_ENTRY = /("VERSION"\s*:\s*")[^"]*(")/;

export function buildWorkerVersion(
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

async function main() {
  const commitSha = process.argv[2] || process.env.WORKER_COMMIT_SHA || "";
  const configPath = resolve(process.argv[3] || "apps/server/wrangler.jsonc");
  const version = await stampWorkerVersion(configPath, commitSha);
  console.log(`Stamped Worker VERSION=${version}`);
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
