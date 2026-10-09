import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  findMissingDeploymentSecretNames,
  REQUIRED_DEPLOYMENT_SECRET_NAMES,
  REQUIRED_WORKER_SECRET_NAMES,
} from "../scripts/verify-deployment-secrets.js";

function readRepositoryFile(relativeUrl: string): string {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

function extractWranglerRequiredSecretNames(config: string): string[] {
  const match = config.match(
    /"secrets"\s*:\s*\{\s*"required"\s*:\s*\[([\s\S]*?)\]/
  );
  return [...(match?.[1] ?? "").matchAll(/"([A-Z0-9_]+)"/g)]
    .map((secretMatch) => secretMatch[1] ?? "")
    .filter(Boolean)
    .sort();
}

const RETIRED_AUTHENTICATION_SECRET_NAMES = [
  "GH_CLIENT_ID",
  "GH_CLIENT_SECRET",
  "GH_ORG_NAME",
  "FEISHU_APP_ID",
  "FEISHU_APP_SECRET",
  "FEISHU_ALLOWED_TENANT_KEYS",
  "OAUTH_ALLOWED_REDIRECT_ORIGINS",
  "OAUTH_SENSITIVE_DATA_KEY",
  "SSO_ISSUER",
  "SSO_CLIENT_ID",
  "SSO_AUDIENCE",
  "SSO_ALLOWED_TENANT_ID",
  "SSO_ALLOWED_REDIRECT_URIS",
] as const;

describe("D1 deployment contract", () => {
  it("configures the official Wrangler migration ledger", () => {
    const config = readRepositoryFile("../wrangler.jsonc");
    expect(config).toContain('"migrations_dir": "d1-migrations"');

    const baseline = readRepositoryFile(
      "../d1-migrations/0000_legacy_schema_baseline.sql"
    );
    expect(baseline).toContain("legacy_schema_baseline");

    const oauthMigration = readRepositoryFile(
      "../d1-migrations/0001_system_user_oauth_security.sql"
    );
    expect(oauthMigration).toContain("provider_tenant_id");
    expect(oauthMigration).toContain("encrypted_profile");
    expect(oauthMigration).toContain(
      "system_user_oauth_provider_identity_unique"
    );
    expect(oauthMigration).toContain("system_user_oauth_user_provider_unique");

    const opsMigration = readRepositoryFile(
      "../d1-migrations/0003_mobile_device_ops.sql"
    );
    expect(opsMigration).toContain("admin_mobile_device_ops_session");
    expect(opsMigration).toContain("admin_mobile_device_ops_audit");
    expect(opsMigration).not.toContain("operator_ticket");

    const webhookMigration = readRepositoryFile(
      "../d1-migrations/0006_webhook_treasury_notification.sql"
    );
    expect(webhookMigration).toContain("base_webhook_config");
    expect(webhookMigration).toContain("us_treasury_30y_yield");
    expect(webhookMigration).not.toContain("open-apis/bot/v2/hook/");

    const webhookAccessMigration = readRepositoryFile(
      "../d1-migrations/0007_webhook_menu_permissions.sql"
    );
    expect(webhookAccessMigration).toContain("/admin/base/webhook_config");
    expect(webhookAccessMigration).toContain("admin.base.webhook_config:read");
    expect(webhookAccessMigration).toContain(
      "admin.base.webhook_config:delete"
    );

    const ssoMigration = readRepositoryFile(
      "../d1-migrations/0008_sso_gateway_identity.sql"
    );
    expect(ssoMigration).toContain("system_user_sso_identity");
    expect(ssoMigration).toContain("system_sso_oidc_transaction");
    expect(ssoMigration).toContain(
      "system_user_sso_identity_issuer_subject_unique"
    );
    expect(ssoMigration).toContain(
      "system_user_sso_identity_user_issuer_unique"
    );
    expect(ssoMigration).toContain("system_sso_oidc_transaction_state_unique");
    expect(ssoMigration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(ssoMigration).not.toMatch(/\bREFERENCES\b/i);

    const oauthStateMigration = readRepositoryFile(
      "../d1-migrations/0009_oauth_state_consistency.sql"
    );
    expect(oauthStateMigration).toContain("system_oauth_state");
    expect(oauthStateMigration).toContain("system_oauth_state_expiry_idx");
    expect(oauthStateMigration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(oauthStateMigration).not.toMatch(/\bREFERENCES\b/i);

    const ssoConnectionMigration = readRepositoryFile(
      "../d1-migrations/0010_sso_connection_configuration.sql"
    );
    expect(ssoConnectionMigration).toContain("system_sso_connection");
    expect(ssoConnectionMigration).toContain("config_version");
    expect(ssoConnectionMigration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(ssoConnectionMigration).not.toMatch(/\bREFERENCES\b/i);

    const authorizationConnectionMigration = readRepositoryFile(
      "../d1-migrations/0011_authorization_connection_configuration.sql"
    );
    expect(authorizationConnectionMigration).toContain(
      "system_authorization_connection"
    );
    expect(authorizationConnectionMigration).toContain(
      "encrypted_client_secret"
    );
    expect(authorizationConnectionMigration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(authorizationConnectionMigration).not.toMatch(/\bREFERENCES\b/i);

    const authorizationAccessMigration = readRepositoryFile(
      "../d1-migrations/0012_authorization_access_credentials.sql"
    );
    expect(authorizationAccessMigration).toContain(
      "cloudflare_access_client_id"
    );
    expect(authorizationAccessMigration).toContain(
      "encrypted_cloudflare_access_client_secret"
    );
    expect(authorizationAccessMigration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(authorizationAccessMigration).not.toMatch(/\bREFERENCES\b/i);
  });

  it("checks the critical production tables before Worker deployment", () => {
    const contract = readRepositoryFile("../d1-contract/worker-schema.sql");
    expect(contract).toContain("FROM `admin_mobile_device`");
    expect(contract).toContain("FROM `admin_mobile_device_event`");
    expect(contract).toContain("FROM `admin_mobile_async_task`");
    expect(contract).toContain("FROM `system_schema_form`");
    expect(contract).toContain(
      "INDEXED BY `admin_mobile_device_last_heartbeat_idx`"
    );
    expect(contract).toContain(
      "INDEXED BY `admin_mobile_device_event_client_event_unique`"
    );
    expect(contract).toContain("FROM `system_user_oauth`");
    expect(contract).toContain("`encrypted_access_token`");
    expect(contract).toContain("`encrypted_cloudflare_access_client_secret`");
    expect(contract).toContain(
      "INDEXED BY `system_user_oauth_provider_identity_unique`"
    );
    expect(contract).toContain(
      "INDEXED BY `system_user_oauth_user_provider_unique`"
    );
    expect(contract).toContain("FROM `system_oauth_state`");
    expect(contract).toContain("INDEXED BY `system_oauth_state_expiry_idx`");
    expect(contract).toContain("FROM `system_user_sso_identity`");
    expect(contract).toContain(
      "INDEXED BY `system_user_sso_identity_issuer_subject_unique`"
    );
    expect(contract).toContain(
      "INDEXED BY `system_user_sso_identity_user_issuer_unique`"
    );
    expect(contract).toContain("FROM `system_sso_oidc_transaction`");
    expect(contract).toContain(
      "INDEXED BY `system_sso_oidc_transaction_state_unique`"
    );
    expect(contract).toContain(
      "INDEXED BY `system_sso_oidc_transaction_expiry_idx`"
    );
    expect(contract).toContain("FROM `system_sso_connection`");
    expect(contract).toContain("`redirect_uris_json`");
    expect(contract).toContain("FROM `system_authorization_connection`");
    expect(contract).toContain("`encrypted_client_secret`");
    expect(contract).toContain("FROM `admin_mobile_device_ops_session`");
    expect(contract).toContain("FROM `admin_mobile_device_ops_audit`");
  });

  it("configures one Durable Object per operations session", () => {
    const config = readRepositoryFile("../wrangler.jsonc");
    expect(config).toContain('"name": "MOBILE_OPS"');
    expect(config).toContain('"class_name": "MobileOpsSession"');
    expect(config).toContain('"new_sqlite_classes": ["MobileOpsSession"]');
  });

  it("configures a SQLite Durable Object for deployment-wide TOTP coordination", () => {
    const config = readRepositoryFile("../wrangler.jsonc");
    expect(config).toContain('"name": "TOTP_GATE_COORDINATOR"');
    expect(config).toContain('"class_name": "TotpGateCoordinator"');
    expect(config).toContain('"tag": "totp-gate-v1"');
    expect(config).toContain('"new_sqlite_classes": ["TotpGateCoordinator"]');
  });

  it("isolates public CI from production credentials, runners and writes", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toMatch(/permissions:\s+contents: read/);
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).not.toContain("self-hosted");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).not.toMatch(/\$\{\{\s*secrets[.[]/);
    expect(workflow).not.toMatch(/--remote\b|cloudflare\/wrangler-action@/);
    expect(workflow).not.toMatch(/db:(?:migrate|check):worker:remote/);
    expect(workflow).not.toMatch(/wrangler\s+pages\s+deploy/);
    const deploymentCommands = workflow.match(/wrangler\s+deploy[^\n]*/g) ?? [];
    expect(deploymentCommands).toHaveLength(1);
    expect(deploymentCommands[0]).toMatch(/--dry-run\b/);
  });

  it("declares active secrets for a separately managed deployment", () => {
    const expectedWorkerSecrets = [...REQUIRED_WORKER_SECRET_NAMES].sort();
    const config = readRepositoryFile("../wrangler.jsonc");
    expect(extractWranglerRequiredSecretNames(config)).toEqual(
      expectedWorkerSecrets
    );
    const example = readRepositoryFile("../.env.example");
    for (const retiredSecretName of RETIRED_AUTHENTICATION_SECRET_NAMES) {
      expect(config).not.toContain(`      "${retiredSecretName}",`);
      expect(example).not.toContain(`${retiredSecretName}=`);
    }
  });

  it("fails the deployment preflight without revealing secret values", () => {
    const environment = Object.fromEntries(
      REQUIRED_DEPLOYMENT_SECRET_NAMES.map((name) => [name, `${name}-value`])
    );
    environment.HODOR_AUTH_MASTER_KEY = "  ";
    environment.JWT_SECRET = "";

    expect(findMissingDeploymentSecretNames(environment)).toEqual([
      "HODOR_AUTH_MASTER_KEY",
      "JWT_SECRET",
    ]);
  });
});
