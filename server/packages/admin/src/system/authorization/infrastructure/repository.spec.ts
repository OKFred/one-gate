import db from "@hodor/core/db/index";
import authorizationConnectionSql from "@hodor/core/db/sql/admin/system_authorization_connection.sql?raw";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AuthorizationConnectionValues } from "../domain/authorization.js";
import { DrizzleAuthorizationConnectionRepository } from "./repository.js";

const repository = new DrizzleAuthorizationConnectionRepository();
const values: AuthorizationConnectionValues = {
  issuer: "https://one.example.com",
  authorizationBaseUrl: "https://one.example.com/authorization/api/v1",
  audience: "https://one.example.com/authorization/api/v1",
  clientId: "hodor-service",
};

beforeAll(async () => {
  await setupTestDb(db, [authorizationConnectionSql]);
});

beforeEach(async () => {
  await clearTestData(db, ["system_authorization_connection"]);
});

describe("DrizzleAuthorizationConnectionRepository", () => {
  it("creates one draft and rejects a stale create", async () => {
    const input = {
      values,
      encryptedClientSecret: "ciphertext-1",
      expectedVersion: 0,
      updatedByUserId: 7,
      nowUtc: 1_000,
    };
    await expect(repository.saveDraft(input)).resolves.toMatchObject({
      status: "draft",
      configVersion: 1,
      encryptedClientSecret: "ciphertext-1",
    });
    await expect(repository.saveDraft(input)).resolves.toBeNull();
  });

  it("uses versions while saving, testing and disabling", async () => {
    await repository.saveDraft({
      values,
      encryptedClientSecret: "ciphertext-1",
      expectedVersion: 0,
      updatedByUserId: 7,
      nowUtc: 1_000,
    });
    await expect(
      repository.markReady({
        expectedVersion: 1,
        updatedByUserId: 7,
        testedAtUtc: 2_000,
      })
    ).resolves.toMatchObject({
      status: "ready",
      configVersion: 2,
      lastTestedAtUtc: 2_000,
    });
    await expect(
      repository.markReady({
        expectedVersion: 1,
        updatedByUserId: 7,
        testedAtUtc: 2_001,
      })
    ).resolves.toBeNull();
    await expect(
      repository.disable({
        expectedVersion: 2,
        updatedByUserId: 8,
        nowUtc: 3_000,
      })
    ).resolves.toMatchObject({
      status: "disabled",
      configVersion: 3,
      updatedByUserId: 8,
    });
  });

  it("rotates ciphertext while returning to draft", async () => {
    await repository.saveDraft({
      values,
      encryptedClientSecret: "ciphertext-1",
      expectedVersion: 0,
      updatedByUserId: 7,
      nowUtc: 1_000,
    });
    await repository.markReady({
      expectedVersion: 1,
      updatedByUserId: 7,
      testedAtUtc: 2_000,
    });
    await expect(
      repository.saveDraft({
        values: { ...values, clientId: "hodor-service-v2" },
        encryptedClientSecret: "ciphertext-2",
        expectedVersion: 2,
        updatedByUserId: 8,
        nowUtc: 3_000,
      })
    ).resolves.toMatchObject({
      status: "draft",
      configVersion: 3,
      clientId: "hodor-service-v2",
      encryptedClientSecret: "ciphertext-2",
      lastTestedAtUtc: null,
    });
  });
});
