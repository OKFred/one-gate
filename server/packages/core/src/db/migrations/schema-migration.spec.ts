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
});
