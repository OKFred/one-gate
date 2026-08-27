import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

function readRepositoryFile(relativeUrl: string): string {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
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
    expect(contract).toContain("FROM `admin_mobile_device_ops_session`");
    expect(contract).toContain("FROM `admin_mobile_device_ops_audit`");
  });

  it("configures one Durable Object per operations session", () => {
    const config = readRepositoryFile("../wrangler.jsonc");
    expect(config).toContain('"name": "MOBILE_OPS"');
    expect(config).toContain('"class_name": "MobileOpsSession"');
    expect(config).toContain('"new_sqlite_classes": ["MobileOpsSession"]');
  });

  it("runs migrations and the schema contract before Worker deployment", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    const migrateAt = workflow.indexOf("Apply Remote D1 Migrations");
    const contractAt = workflow.indexOf("Verify Remote D1 Schema Contract");
    const deployAt = workflow.indexOf("Deploy Workers Backend");

    expect(migrateAt).toBeGreaterThan(-1);
    expect(contractAt).toBeGreaterThan(migrateAt);
    expect(deployAt).toBeGreaterThan(contractAt);
  });

  it("deploys required OAuth secrets and treats Feishu credentials as optional", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    for (const secretName of [
      "MOBILE_SENSITIVE_DATA_KEY",
      "OAUTH_SENSITIVE_DATA_KEY",
      "OAUTH_ALLOWED_REDIRECT_ORIGINS",
    ]) {
      expect(workflow).toContain(
        `${secretName}: \${{ secrets.${secretName} }}`
      );
    }
    expect(workflow).toContain("Configure Optional Feishu Secrets");
    for (const secretName of [
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "FEISHU_ALLOWED_TENANT_KEYS",
    ]) {
      expect(workflow).toContain(
        `${secretName}: \${{ secrets.${secretName} }}`
      );
    }

    const config = readRepositoryFile("../wrangler.jsonc");
    expect(config).toContain('"secrets"');
    expect(config).toContain('"OAUTH_SENSITIVE_DATA_KEY"');
    for (const secretName of [
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "FEISHU_ALLOWED_TENANT_KEYS",
    ]) {
      expect(config).not.toContain(`      "${secretName}",`);
    }
  });
});
