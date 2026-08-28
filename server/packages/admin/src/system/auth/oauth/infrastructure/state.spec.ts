import db from "@hodor/core/db/index";
import oauthStateSql from "@hodor/core/db/sql/admin/system_oauth_state.sql?raw";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { OAuthStateRecord } from "../domain/oauth.js";
import { oauthStateTable } from "../model.js";
import { drizzleOAuthStateAdapter } from "./state.js";

const NOW_UTC = 10_000;

function record(overrides: Partial<OAuthStateRecord> = {}): OAuthStateRecord {
  return {
    provider: "github",
    intent: "login",
    redirectUri: "https://gate.example.com/oauth/callback",
    userId: null,
    expiresAtUtc: NOW_UTC + 60_000,
    ...overrides,
  };
}

beforeAll(async () => {
  await setupTestDb(db, [oauthStateSql]);
});

beforeEach(async () => {
  await clearTestData(db, ["system_oauth_state"]);
});

describe("D1 OAuth state adapter", () => {
  it("只保存 state 摘要并恢复可信上下文", async () => {
    const state = await drizzleOAuthStateAdapter.create(record());
    const rows = await db.select().from(oauthStateTable);

    expect(state).toHaveLength(43);
    expect(rows).toHaveLength(1);
    expect(rows[0].stateDigest).not.toBe(state);
    await expect(
      drizzleOAuthStateAdapter.consume(state, NOW_UTC)
    ).resolves.toEqual(record());
  });

  it("并发和重放只能原子消费一次", async () => {
    const state = await drizzleOAuthStateAdapter.create(record());

    const results = await Promise.all([
      drizzleOAuthStateAdapter.consume(state, NOW_UTC),
      drizzleOAuthStateAdapter.consume(state, NOW_UTC + 1),
    ]);

    expect(results.filter((item) => item !== null)).toHaveLength(1);
    await expect(
      drizzleOAuthStateAdapter.consume(state, NOW_UTC + 2)
    ).resolves.toBeNull();
  });

  it("拒绝消费已过期 state", async () => {
    const state = await drizzleOAuthStateAdapter.create(
      record({ expiresAtUtc: NOW_UTC })
    );

    await expect(
      drizzleOAuthStateAdapter.consume(state, NOW_UTC)
    ).resolves.toBeNull();
    const rows = await db.select().from(oauthStateTable);
    expect(rows[0].consumedAtUtc).toBeNull();
  });

  it("清理已消费和已过期记录", async () => {
    const consumed = await drizzleOAuthStateAdapter.create(record());
    await drizzleOAuthStateAdapter.create(record({ expiresAtUtc: NOW_UTC }));
    await drizzleOAuthStateAdapter.consume(consumed, NOW_UTC);

    await expect(drizzleOAuthStateAdapter.deleteRetired(NOW_UTC)).resolves.toBe(
      2
    );
    await expect(db.select().from(oauthStateTable)).resolves.toHaveLength(0);
  });
});
