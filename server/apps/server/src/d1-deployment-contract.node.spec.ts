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

function readWorkflowStep(workflow: string, name: string): string {
  const startMarker = `      - name: ${name}`;
  const start = workflow.indexOf(startMarker);
  if (start < 0) {
    return "";
  }

  const nextStep = workflow.indexOf(
    "\n      - name:",
    start + startMarker.length
  );
  return workflow.slice(start, nextStep < 0 ? undefined : nextStep);
}

function extractSecretReferences(step: string): string[] {
  return [
    ...step.matchAll(
      /^\s+([A-Z0-9_]+):\s+\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}\s*$/gm
    ),
  ]
    .filter((match) => match[1] === match[2])
    .map((match) => match[1] ?? "")
    .filter(Boolean)
    .sort();
}

function extractUploadedSecretNames(step: string): string[] {
  const match = step.match(/secrets:\s*\|\r?\n([\s\S]*?)\r?\n\s+env:/);
  return (match?.[1] ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Z0-9_]+$/.test(line))
    .sort();
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

  it("runs migrations and the schema contract before Worker deployment", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    const preflightAt = workflow.indexOf("Verify Deployment Secret Inputs");
    const migrateAt = workflow.indexOf("Apply Remote D1 Migrations");
    const contractAt = workflow.indexOf("Verify Remote D1 Schema Contract");
    const deployAt = workflow.indexOf("Deploy Workers Backend");

    expect(preflightAt).toBeGreaterThan(-1);
    expect(migrateAt).toBeGreaterThan(preflightAt);
    expect(contractAt).toBeGreaterThan(migrateAt);
    expect(deployAt).toBeGreaterThan(contractAt);
  });

  it("deploys only Hodor root secrets and the temporary SSO bridge", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    const preflightStep = readWorkflowStep(
      workflow,
      "Verify Deployment Secret Inputs"
    );
    const deployStep = readWorkflowStep(workflow, "Deploy Workers Backend");
    const expectedWorkerSecrets = [...REQUIRED_WORKER_SECRET_NAMES].sort();
    const expectedDeploymentSecrets = [
      ...REQUIRED_DEPLOYMENT_SECRET_NAMES,
    ].sort();
    expect(extractSecretReferences(preflightStep)).toEqual(
      expectedDeploymentSecrets
    );
    expect(extractUploadedSecretNames(deployStep)).toEqual(
      expectedWorkerSecrets
    );
    expect(extractSecretReferences(deployStep)).toEqual(expectedWorkerSecrets);
    expect(workflow).not.toContain("Configure Optional Feishu Secrets");
    for (const retiredSecretName of [
      "GH_CLIENT_ID",
      "GH_CLIENT_SECRET",
      "GH_ORG_NAME",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "FEISHU_ALLOWED_TENANT_KEYS",
      "OAUTH_ALLOWED_REDIRECT_ORIGINS",
    ]) {
      expect(workflow).not.toContain(retiredSecretName);
    }

    const config = readRepositoryFile("../wrangler.jsonc");
    expect(extractWranglerRequiredSecretNames(config)).toEqual(
      expectedWorkerSecrets
    );
    for (const retiredSecretName of [
      "GH_CLIENT_ID",
      "GH_CLIENT_SECRET",
      "GH_ORG_NAME",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "FEISHU_ALLOWED_TENANT_KEYS",
      "OAUTH_ALLOWED_REDIRECT_ORIGINS",
    ]) {
      expect(config).not.toContain(`      "${retiredSecretName}",`);
    }
  });

  it("fails the deployment preflight without revealing secret values", () => {
    const environment = Object.fromEntries(
      REQUIRED_DEPLOYMENT_SECRET_NAMES.map((name) => [name, `${name}-value`])
    );
    environment.HODOR_AUTH_MASTER_KEY = "  ";
    environment.SSO_CLIENT_ID = "";

    expect(findMissingDeploymentSecretNames(environment)).toEqual([
      "HODOR_AUTH_MASTER_KEY",
      "SSO_CLIENT_ID",
    ]);
  });
});
