import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import ssoTransactionSql from "@hodor/core/db/sql/admin/system_sso_oidc_transaction.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import ssoIdentitySql from "@hodor/core/db/sql/admin/system_user_sso_identity.sql?raw";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { userTable } from "../../../user/model.js";
import type { NewSsoBinding } from "../application/ports.js";
import {
  SsoErrorCode,
  type SsoTransaction,
  type VerifiedSsoPrincipal,
} from "../domain/sso.js";
import { ssoOidcTransactionTable } from "../model.js";
import { DrizzleSsoRepository } from "./repository.js";

const ISSUER = "https://sso.example.com";
const repository = new DrizzleSsoRepository();

function createBinding(overrides: Partial<NewSsoBinding> = {}): NewSsoBinding {
  return {
    userId: 1,
    issuer: ISSUER,
    subject: "subject-1",
    principalUserId: "principal-user-1",
    tenantId: "tenant-1",
    membershipId: "membership-1",
    clientId: "hodor-client",
    amr: ["pwd"],
    scope: ["openid", "profile"],
    createTimeUtc: 1_000,
    updateTimeUtc: null,
    ...overrides,
  };
}

function createTransaction(
  overrides: Partial<SsoTransaction> = {}
): SsoTransaction {
  return {
    id: "transaction-1",
    stateDigest: "state-digest-1",
    intent: "login",
    expectedUserId: null,
    issuer: ISSUER,
    clientId: "hodor-client",
    tenantId: "tenant-1",
    redirectUri: "https://gate.example.com/sso/callback",
    encryptedCodeVerifier: "encrypted-verifier",
    nonceDigest: "nonce-digest",
    expiresAtUtc: 20_000,
    consumedAtUtc: null,
    createTimeUtc: 1_000,
    ...overrides,
  };
}

async function insertUser(input: {
  id: number;
  username: string;
  isEnabled: boolean;
}): Promise<void> {
  await db.insert(userTable).values({
    id: input.id,
    username: input.username,
    password: "not-used-by-sso-tests",
    langCode: "zh-CN",
    remark: null,
    regionId: null,
    departmentId: null,
    roleIdArr: [],
    isEnabled: input.isEnabled,
    creatorId: 1,
    updaterId: null,
    createTimeUtc: 1,
    updateTimeUtc: null,
  });
}

beforeAll(async () => {
  await setupTestDb(db, [userSql, ssoIdentitySql, ssoTransactionSql]);
});

beforeEach(async () => {
  await clearTestData(db, [
    "system_sso_oidc_transaction",
    "system_user_sso_identity",
    "system_user",
  ]);
  await insertUser({ id: 1, username: "enabled-user", isEnabled: true });
  await insertUser({ id: 2, username: "second-user", isEnabled: true });
  await insertUser({ id: 3, username: "disabled-user", isEnabled: false });
});

describe("DrizzleSsoRepository transactions", () => {
  it("atomically consumes a valid transaction once", async () => {
    await repository.createTransaction(createTransaction());

    const results = await Promise.all([
      repository.consumeTransaction("state-digest-1", 10_000),
      repository.consumeTransaction("state-digest-1", 10_001),
    ]);

    expect(results.filter((item) => item !== null)).toHaveLength(1);
    expect(results.find((item) => item !== null)).toMatchObject({
      id: "transaction-1",
      stateDigest: "state-digest-1",
    });
    await expect(
      repository.consumeTransaction("state-digest-1", 10_002)
    ).resolves.toBeNull();
  });

  it("does not consume an expired transaction", async () => {
    await repository.createTransaction(
      createTransaction({ expiresAtUtc: 10_000 })
    );

    await expect(
      repository.consumeTransaction("state-digest-1", 10_000)
    ).resolves.toBeNull();

    const rows = await db.select().from(ssoOidcTransactionTable);
    expect(rows[0].consumedAtUtc).toBeNull();
  });
});

describe("DrizzleSsoRepository bindings", () => {
  it("creates, finds and deletes an enabled user's binding", async () => {
    const created = await repository.createBinding(createBinding());
    expect(created).toMatchObject({ outcome: "created" });

    await expect(
      repository.findBindingBySubject(ISSUER, "subject-1")
    ).resolves.toMatchObject({ userId: 1, amr: ["pwd"] });
    await expect(
      repository.findBindingByUserAndIssuer(1, ISSUER)
    ).resolves.toMatchObject({ subject: "subject-1" });
    await expect(repository.deleteBinding(1, ISSUER)).resolves.toBe(true);
    await expect(repository.deleteBinding(1, ISSUER)).resolves.toBe(false);
  });

  it("uses unique indexes to distinguish subject and user conflicts", async () => {
    await repository.createBinding(createBinding());

    await expect(
      repository.createBinding(createBinding({ userId: 2 }))
    ).resolves.toEqual({ outcome: "subject_conflict" });
    await expect(
      repository.createBinding(createBinding({ subject: "subject-2" }))
    ).resolves.toEqual({ outcome: "user_conflict" });
  });

  it("rejects missing and disabled local users before inserting", async () => {
    await expect(
      repository.createBinding(createBinding({ userId: 999 }))
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_DISABLED });
    await expect(
      repository.createBinding(createBinding({ userId: 3 }))
    ).rejects.toMatchObject({ code: SsoErrorCode.ACCOUNT_DISABLED });

    await expect(
      repository.findBindingBySubject(ISSUER, "subject-1")
    ).resolves.toBeNull();
  });

  it("atomically refreshes verification fields without changing identity keys", async () => {
    const created = await repository.createBinding(createBinding());
    if (created.outcome !== "created") {
      throw new Error("Expected the binding fixture to be created");
    }
    const principal: VerifiedSsoPrincipal = {
      issuer: ISSUER,
      subject: "subject-1",
      userId: "principal-user-refreshed",
      tenantId: "tenant-refreshed",
      membershipId: "membership-refreshed",
      clientId: "hodor-client-refreshed",
      amr: ["pwd", "mfa"],
      scope: ["openid", "email"],
    };

    await repository.updateBindingVerification(
      created.bindingId,
      principal,
      30_000
    );

    const refreshed = await repository.findBindingBySubject(
      ISSUER,
      "subject-1"
    );
    expect(refreshed).toMatchObject({
      id: created.bindingId,
      userId: 1,
      issuer: ISSUER,
      subject: "subject-1",
      principalUserId: "principal-user-refreshed",
      tenantId: "tenant-refreshed",
      membershipId: "membership-refreshed",
      clientId: "hodor-client-refreshed",
      amr: ["pwd", "mfa"],
      scope: ["openid", "email"],
      createTimeUtc: 1_000,
      updateTimeUtc: 30_000,
    });
  });
});
