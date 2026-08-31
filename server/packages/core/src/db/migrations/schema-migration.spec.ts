import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createClient, type Client } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";

const clients: Client[] = [];

function createMemoryClient(): Client {
  const client = createClient({ url: ":memory:" });
  clients.push(client);
  return client;
}

function readMigration(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");
}

async function executeSqlFile(client: Client, sql: string): Promise<void> {
  for (const statement of sql
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)) {
    await client.execute(statement);
  }
}

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe("legacy D1 schema migrations", () => {
  it("upgrades the legacy mobile device table without losing existing rows", async () => {
    const client = createMemoryClient();
    await client.execute(`
      CREATE TABLE admin_mobile_device (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        client_id TEXT NOT NULL,
        device_name TEXT,
        is_enabled INTEGER NOT NULL,
        remark TEXT,
        creator_id INTEGER NOT NULL,
        updater_id INTEGER,
        create_time_utc INTEGER NOT NULL,
        update_time_utc INTEGER
      )
    `);
    await client.execute({
      sql: `INSERT INTO admin_mobile_device
        (client_id, device_name, is_enabled, remark, creator_id, create_time_utc)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: ["legacy-device", "pixel", 1, "keep-me", 1, 1],
    });

    await executeSqlFile(
      client,
      readMigration("./20260810_11_mobile_device_reporting.sql")
    );

    const columns = await client.execute(
      "PRAGMA table_info('admin_mobile_device')"
    );
    expect(columns.rows.map((row) => String(row.name))).toHaveLength(36);
    expect(columns.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "reported_status",
        "last_heartbeat_time_utc",
        "model",
        "report_token_hash",
      ])
    );
    const row = await client.execute(
      "SELECT client_id, remark, model FROM admin_mobile_device"
    );
    expect(row.rows).toMatchObject([
      { client_id: "legacy-device", remark: "keep-me", model: null },
    ]);

    const objects = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE name IN (
        'admin_mobile_device_last_heartbeat_idx',
        'admin_mobile_device_status_idx',
        'admin_mobile_device_event',
        'admin_mobile_device_event_client_event_unique',
        'admin_mobile_device_event_client_time_idx',
        'admin_mobile_device_event_type_idx'
      )
    `);
    expect(new Set(objects.rows.map((item) => String(item.name)))).toEqual(
      new Set([
        "admin_mobile_device_last_heartbeat_idx",
        "admin_mobile_device_status_idx",
        "admin_mobile_device_event",
        "admin_mobile_device_event_client_event_unique",
        "admin_mobile_device_event_client_time_idx",
        "admin_mobile_device_event_type_idx",
      ])
    );
  });

  it("upgrades the legacy async task table to the current 26-column contract", async () => {
    const client = createMemoryClient();
    await client.execute(`
      CREATE TABLE admin_mobile_async_task (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        task_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        cat TEXT NOT NULL,
        script TEXT NOT NULL,
        status TEXT NOT NULL,
        result_message TEXT,
        expires_at_utc INTEGER NOT NULL,
        remark TEXT,
        creator_id INTEGER NOT NULL,
        updater_id INTEGER,
        create_time_utc INTEGER NOT NULL,
        update_time_utc INTEGER
      )
    `);

    for (const name of [
      "20260810_01_autojs6_protocol_version.sql",
      "20260810_02_autojs6_script_id.sql",
      "20260810_03_autojs6_script_version.sql",
      "20260810_04_autojs6_params_json.sql",
      "20260810_05_autojs6_timeout_ms.sql",
      "20260810_06_autojs6_trace_id.sql",
      "20260810_07_autojs6_result_code.sql",
      "20260810_08_autojs6_result_data_json.sql",
      "20260810_09_autojs6_started_at.sql",
      "20260810_10_autojs6_finished_at.sql",
      "20260811_01_autojs6_task_priority.sql",
      "20260811_02_autojs6_preempt_running.sql",
      "20260811_03_autojs6_preempted_by_task_id.sql",
    ]) {
      await executeSqlFile(client, readMigration(`./${name}`));
    }

    const columns = await client.execute(
      "PRAGMA table_info('admin_mobile_async_task')"
    );
    expect(columns.rows.map((row) => String(row.name))).toHaveLength(26);
    expect(columns.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "protocol_version",
        "script_id",
        "priority",
        "preempt_running",
        "preempted_by_task_id",
      ])
    );
  });

  it("upgrades OAuth bindings with encrypted data columns and unique identities", async () => {
    const client = createMemoryClient();
    await client.execute(`
      CREATE TABLE system_user_oauth (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        provider_username TEXT,
        create_time_utc INTEGER NOT NULL,
        update_time_utc INTEGER
      )
    `);
    await client.execute({
      sql: `INSERT INTO system_user_oauth
        (user_id, provider, provider_id, provider_username, create_time_utc)
        VALUES (?, ?, ?, ?, ?)`,
      args: [7, "github", "provider-user-7", "octocat", 1],
    });

    await executeSqlFile(
      client,
      readMigration("./20260813_01_system_user_oauth_security.sql")
    );

    const columns = await client.execute(
      "PRAGMA table_info('system_user_oauth')"
    );
    expect(columns.rows.map((row) => String(row.name))).toHaveLength(14);
    expect(columns.rows.map((row) => String(row.name))).toEqual(
      expect.arrayContaining([
        "provider_tenant_id",
        "encrypted_profile",
        "encrypted_access_token",
        "encrypted_refresh_token",
        "scopes",
        "token_expires_at_utc",
        "last_verified_at_utc",
      ])
    );

    const indexes = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND name LIKE 'system_user_oauth_%_unique'
    `);
    expect(new Set(indexes.rows.map((item) => String(item.name)))).toEqual(
      new Set([
        "system_user_oauth_provider_identity_unique",
        "system_user_oauth_user_provider_unique",
      ])
    );

    await expect(
      client.execute({
        sql: `INSERT INTO system_user_oauth
          (user_id, provider, provider_id, create_time_utc)
          VALUES (?, ?, ?, ?)`,
        args: [8, "github", "provider-user-7", 2],
      })
    ).rejects.toThrow();
    await expect(
      client.execute({
        sql: `INSERT INTO system_user_oauth
          (user_id, provider, provider_id, create_time_utc)
          VALUES (?, ?, ?, ?)`,
        args: [7, "github", "provider-user-8", 2],
      })
    ).rejects.toThrow();
  });

  it("creates SSO bindings and one-time OIDC transactions without foreign keys", async () => {
    const client = createMemoryClient();
    const migration = readMigration("./20260827_01_sso_gateway_identity.sql");

    expect(migration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(migration).not.toMatch(/\bREFERENCES\b/i);
    await executeSqlFile(client, migration);

    const objects = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE name LIKE 'system_user_sso_identity%'
         OR name LIKE 'system_sso_oidc_transaction%'
    `);
    expect(new Set(objects.rows.map((row) => String(row.name)))).toEqual(
      new Set([
        "system_user_sso_identity",
        "system_user_sso_identity_issuer_subject_unique",
        "system_user_sso_identity_user_issuer_unique",
        "system_sso_oidc_transaction",
        "system_sso_oidc_transaction_state_unique",
        "system_sso_oidc_transaction_expiry_idx",
      ])
    );

    const identityForeignKeys = await client.execute(
      "PRAGMA foreign_key_list('system_user_sso_identity')"
    );
    const transactionForeignKeys = await client.execute(
      "PRAGMA foreign_key_list('system_sso_oidc_transaction')"
    );
    expect(identityForeignKeys.rows).toHaveLength(0);
    expect(transactionForeignKeys.rows).toHaveLength(0);

    const identityColumns = await client.execute(
      "PRAGMA table_info('system_user_sso_identity')"
    );
    expect(identityColumns.rows.map((row) => String(row.name))).toEqual([
      "id",
      "user_id",
      "issuer",
      "subject",
      "principal_user_id",
      "tenant_id",
      "membership_id",
      "client_id",
      "amr",
      "scope",
      "create_time_utc",
      "update_time_utc",
    ]);

    const transactionColumns = await client.execute(
      "PRAGMA table_info('system_sso_oidc_transaction')"
    );
    expect(transactionColumns.rows.map((row) => String(row.name))).toEqual([
      "id",
      "state_digest",
      "intent",
      "expected_user_id",
      "issuer",
      "client_id",
      "tenant_id",
      "redirect_uri",
      "encrypted_code_verifier",
      "nonce_digest",
      "expires_at_utc",
      "consumed_at_utc",
      "create_time_utc",
    ]);
  });

  it("creates one-time OAuth state storage without foreign keys", async () => {
    const client = createMemoryClient();
    const migration = readMigration(
      "./20260828_01_oauth_state_consistency.sql"
    );

    expect(migration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(migration).not.toMatch(/\bREFERENCES\b/i);
    await executeSqlFile(client, migration);

    const columns = await client.execute(
      "PRAGMA table_info('system_oauth_state')"
    );
    expect(columns.rows.map((row) => String(row.name))).toEqual([
      "state_digest",
      "provider",
      "intent",
      "redirect_uri",
      "user_id",
      "expires_at_utc",
      "consumed_at_utc",
      "create_time_utc",
    ]);
    const foreignKeys = await client.execute(
      "PRAGMA foreign_key_list('system_oauth_state')"
    );
    expect(foreignKeys.rows).toHaveLength(0);
    const indexes = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND name = 'system_oauth_state_expiry_idx'
    `);
    expect(indexes.rows).toHaveLength(1);
  });

  it("creates a versioned SSO connection configuration without foreign keys", async () => {
    const client = createMemoryClient();
    const migration = readMigration(
      "./20260901_01_sso_connection_configuration.sql"
    );

    expect(migration).not.toMatch(/\bFOREIGN\s+KEY\b/i);
    expect(migration).not.toMatch(/\bREFERENCES\b/i);
    await executeSqlFile(client, migration);

    const columns = await client.execute(
      "PRAGMA table_info('system_sso_connection')"
    );
    expect(columns.rows.map((row) => String(row.name))).toEqual([
      "id",
      "issuer",
      "client_id",
      "audience",
      "allowed_tenant_id",
      "redirect_uris_json",
      "status",
      "config_version",
      "last_tested_at_utc",
      "updated_by_user_id",
      "create_time_utc",
      "update_time_utc",
    ]);
    const foreignKeys = await client.execute(
      "PRAGMA foreign_key_list('system_sso_connection')"
    );
    expect(foreignKeys.rows).toHaveLength(0);

    await client.execute(`
      INSERT INTO system_sso_connection (
        id, issuer, client_id, audience, allowed_tenant_id,
        redirect_uris_json, status, config_version, create_time_utc
      ) VALUES (
        'default', 'https://sso.example.com', 'hodor', 'urn:hodor', 'tenant-1',
        '["https://gate.example.com/sso/callback"]', 'draft', 1, 1
      )
    `);
    await expect(
      client.execute(`
        INSERT INTO system_sso_connection (
          id, issuer, client_id, audience, allowed_tenant_id,
          redirect_uris_json, status, config_version, create_time_utc
        ) VALUES (
          'other', 'https://sso.example.com', 'hodor', 'urn:hodor', 'tenant-1',
          '[]', 'ready', 1, 1
        )
      `)
    ).rejects.toThrow();
  });

  it("creates immutable client release, environment revision, and deployment tables", async () => {
    const client = createMemoryClient();
    await executeSqlFile(
      client,
      readMigration("./20260814_01_mobile_client_deployment.sql")
    );

    const objects = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE name LIKE 'admin_mobile_client_%'
    `);
    const names = new Set(objects.rows.map((item) => String(item.name)));
    expect(names).toEqual(
      new Set([
        "admin_mobile_client_release",
        "admin_mobile_client_release_version_unique",
        "admin_mobile_client_release_digest_unique",
        "admin_mobile_client_release_status_idx",
        "admin_mobile_client_environment",
        "admin_mobile_client_environment_name_unique",
        "admin_mobile_client_environment_revision",
        "admin_mobile_client_env_revision_unique",
        "admin_mobile_client_deployment",
        "admin_mobile_client_deployment_id_unique",
        "admin_mobile_client_deployment_active_device_unique",
        "admin_mobile_client_deployment_device_time_idx",
        "admin_mobile_client_deployment_phase_idx",
      ])
    );

    await client.execute(`
      INSERT INTO admin_mobile_client_deployment (
        deployment_id, client_id, active_client_id, release_id,
        release_version, release_digest, environment_revision_id,
        environment, environment_revision, activation_mode,
        drain_timeout_ms, phase, expires_at_utc, creator_id
      ) VALUES (
        '00000000-0000-4000-8000-000000000001', 'phone-001', 'phone-001', 1,
        'v1.2.3', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 1,
        'production', 1, 'GRACEFUL', 900000, 'PENDING', 1, 1
      )
    `);
    await expect(
      client.execute(`
        INSERT INTO admin_mobile_client_deployment (
          deployment_id, client_id, active_client_id, release_id,
          release_version, release_digest, environment_revision_id,
          environment, environment_revision, activation_mode,
          drain_timeout_ms, phase, expires_at_utc, creator_id
        ) VALUES (
          '00000000-0000-4000-8000-000000000002', 'phone-001', 'phone-001', 1,
          'v1.2.3', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 1,
          'production', 1, 'GRACEFUL', 900000, 'PENDING', 1, 1
        )
      `)
    ).rejects.toThrow();
  });

  it("adds mobile client control-plane permissions idempotently", async () => {
    const client = createMemoryClient();
    await client.execute(`
      CREATE TABLE system_permission (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        resource TEXT,
        business TEXT,
        remark TEXT,
        is_enabled INTEGER NOT NULL,
        creator_id INTEGER NOT NULL
      )
    `);
    const migration = readMigration(
      "./20260822_01_mobile_client_permissions.sql"
    );
    await executeSqlFile(client, migration);
    await executeSqlFile(client, migration);

    const rows = await client.execute(`
      SELECT code FROM system_permission
      WHERE code LIKE 'admin.mobile.client_%'
      ORDER BY code
    `);
    expect(rows.rows.map((row) => String(row.code))).toEqual([
      "admin.mobile.client_deployment:dispatch",
      "admin.mobile.client_deployment:read",
      "admin.mobile.client_environment:dispatch",
      "admin.mobile.client_environment:read",
      "admin.mobile.client_release:dispatch",
      "admin.mobile.client_release:read",
    ]);
  });

  it("creates per-device network routing state and permissions idempotently", async () => {
    const client = createMemoryClient();
    await client.execute(`
      CREATE TABLE system_permission (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        resource TEXT,
        business TEXT,
        remark TEXT,
        is_enabled INTEGER NOT NULL,
        creator_id INTEGER NOT NULL
      )
    `);
    await executeSqlFile(
      client,
      readMigration("./20260822_02_mobile_network_routing.sql")
    );
    const permissionMigration = readMigration(
      "./20260822_03_mobile_network_routing_permissions.sql"
    );
    await executeSqlFile(client, permissionMigration);
    await executeSqlFile(client, permissionMigration);

    const objects = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE name LIKE 'admin_mobile_network_routing%'
    `);
    expect(new Set(objects.rows.map((row) => String(row.name)))).toEqual(
      new Set([
        "admin_mobile_network_routing",
        "admin_mobile_network_routing_client_unique",
        "admin_mobile_network_routing_active_task_unique",
        "admin_mobile_network_routing_state_idx",
      ])
    );
    const permissions = await client.execute(`
      SELECT code FROM system_permission
      WHERE code LIKE 'admin.mobile.network_routing:%'
      ORDER BY code
    `);
    expect(permissions.rows.map((row) => String(row.code))).toEqual([
      "admin.mobile.network_routing:edit",
      "admin.mobile.network_routing:read",
    ]);
  });

  it("creates Webhook config and seeds the Treasury task idempotently", async () => {
    const client = createMemoryClient();
    await client.execute(`
      CREATE TABLE maintenance_api_task (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_key TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        base_url TEXT NOT NULL,
        path TEXT NOT NULL,
        method TEXT NOT NULL,
        headers TEXT,
        timeout_ms INTEGER NOT NULL,
        is_enabled INTEGER NOT NULL,
        creator_id INTEGER NOT NULL
      )
    `);
    await client.execute(`
      CREATE TABLE system_cron_job (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_key TEXT NOT NULL,
        name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        status INTEGER NOT NULL,
        parameters TEXT,
        run_count INTEGER NOT NULL,
        creator_id INTEGER NOT NULL
      )
    `);

    const migration = readMigration("./20260823_01_webhook_config.sql");
    await executeSqlFile(client, migration);
    await executeSqlFile(client, migration);

    const webhookTable = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'base_webhook_config'"
    );
    expect(webhookTable.rows).toHaveLength(1);
    const tasks = await client.execute(
      "SELECT task_key FROM maintenance_api_task WHERE task_key = 'us_treasury_30y_yield'"
    );
    const jobs = await client.execute(
      "SELECT job_key, cron_expression FROM system_cron_job WHERE job_key = 'us_treasury_30y_yield'"
    );
    expect(tasks.rows).toHaveLength(1);
    expect(jobs.rows).toMatchObject([
      { job_key: "us_treasury_30y_yield", cron_expression: "0 1 * * *" },
    ]);
  });
});
