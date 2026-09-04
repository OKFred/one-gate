import { pathToFileURL } from "node:url";

export const REQUIRED_WORKER_SECRET_NAMES = [
  "HODOR_AUTH_MASTER_KEY",
  "JWT_SECRET",
  "MOBILE_SENSITIVE_DATA_KEY",
  "MOBILE_RELEASE_PUBLISH_TOKEN",
  "HODOR_TOTP_GATE_SECRET",
  "HODOR_ALLOWED_WEB_ORIGINS",
] as const;

export const REQUIRED_DEPLOYMENT_SECRET_NAMES = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  ...REQUIRED_WORKER_SECRET_NAMES,
] as const;

type DeploymentEnvironment = Readonly<Record<string, string | undefined>>;

export function findMissingDeploymentSecretNames(
  environment: DeploymentEnvironment
): string[] {
  return REQUIRED_DEPLOYMENT_SECRET_NAMES.filter(
    (name) => !environment[name]?.trim()
  );
}

function verifyDeploymentSecrets(environment: DeploymentEnvironment): void {
  const missingNames = findMissingDeploymentSecretNames(environment);
  if (missingNames.length > 0) {
    console.error(
      `Missing required deployment secret inputs: ${missingNames.join(", ")}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Verified ${REQUIRED_DEPLOYMENT_SECRET_NAMES.length} deployment secret inputs.`
  );
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  verifyDeploymentSecrets(process.env);
}
