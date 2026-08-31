import { describe, expect, it } from "vitest";
import type {
  AuthorizationConnection,
  AuthorizationConnectionValues,
  AuthorizationDecisionResult,
} from "../domain/authorization.js";
import { HodorAuthorizationErrorCode } from "../domain/authorization.js";
import { AuthorizationCenter } from "./authorization-center.js";
import type {
  AuthorizationCenterDependencies,
  AuthorizationConnectionRepositoryPort,
  AuthorizationGatewayPort,
} from "./ports.js";

const values: AuthorizationConnectionValues = {
  issuer: "https://one.example.com",
  authorizationBaseUrl: "https://one.example.com/authorization/api/v1",
  audience: "https://one.example.com/authorization/api/v1",
  clientId: "hodor-service",
};

function connection(
  overrides: Partial<AuthorizationConnection> = {}
): AuthorizationConnection {
  return {
    id: "default",
    ...values,
    encryptedClientSecret: "encrypted:client-secret-1234",
    status: "draft",
    configVersion: 1,
    lastTestedAtUtc: null,
    updatedByUserId: 1,
    createTimeUtc: 1,
    updateTimeUtc: null,
    ...overrides,
  };
}

class FakeRepository implements AuthorizationConnectionRepositoryPort {
  current: AuthorizationConnection | null = null;

  async findConnection() {
    return this.current;
  }

  async saveDraft(
    input: Parameters<AuthorizationConnectionRepositoryPort["saveDraft"]>[0]
  ) {
    if (
      (this.current === null && input.expectedVersion !== 0) ||
      (this.current !== null &&
        this.current.configVersion !== input.expectedVersion)
    ) {
      return null;
    }
    this.current = connection({
      ...input.values,
      encryptedClientSecret: input.encryptedClientSecret,
      status: "draft",
      configVersion: input.expectedVersion + 1,
      updatedByUserId: input.updatedByUserId,
      createTimeUtc: this.current?.createTimeUtc ?? input.nowUtc,
      updateTimeUtc: input.nowUtc,
    });
    return this.current;
  }

  async markReady(
    input: Parameters<AuthorizationConnectionRepositoryPort["markReady"]>[0]
  ) {
    if (
      this.current?.status !== "draft" ||
      this.current.configVersion !== input.expectedVersion
    ) {
      return null;
    }
    this.current = connection({
      ...this.current,
      status: "ready",
      configVersion: input.expectedVersion + 1,
      lastTestedAtUtc: input.testedAtUtc,
      updatedByUserId: input.updatedByUserId,
      updateTimeUtc: input.testedAtUtc,
    });
    return this.current;
  }

  async disable(
    input: Parameters<AuthorizationConnectionRepositoryPort["disable"]>[0]
  ) {
    if (this.current?.configVersion !== input.expectedVersion) return null;
    this.current = connection({
      ...this.current,
      status: "disabled",
      configVersion: input.expectedVersion + 1,
      updatedByUserId: input.updatedByUserId,
      updateTimeUtc: input.nowUtc,
    });
    return this.current;
  }
}

class FakeGateway implements AuthorizationGatewayPort {
  testCalls = 0;
  decisionCalls = 0;
  decisionResult: AuthorizationDecisionResult = {
    data: {
      decisionId: "decision-1",
      allowed: true,
      reason: "POLICY_ALLOW",
      policyRevision: 1,
    },
    requestId: "request-1",
  };

  async testConnection() {
    this.testCalls += 1;
  }

  async checkDecision() {
    this.decisionCalls += 1;
    return this.decisionResult;
  }
}

function createFixture() {
  const repository = new FakeRepository();
  const gateway = new FakeGateway();
  const plaintextByCiphertext = new Map<string, string>([
    ["encrypted:client-secret-1234", "client-secret-1234"],
  ]);
  const dependencies: AuthorizationCenterDependencies = {
    repository,
    gateway,
    cipher: {
      encrypt: async (plaintext, aad) => {
        const ciphertext = `cipher:${aad}:${plaintext.length}`;
        plaintextByCiphertext.set(ciphertext, plaintext);
        return ciphertext;
      },
      decrypt: async (ciphertext) => {
        const plaintext = plaintextByCiphertext.get(ciphertext);
        if (plaintext === undefined) throw new Error("Unknown ciphertext");
        return plaintext;
      },
    },
    clock: { now: () => 1_000 },
    allowInsecureLocalhost: false,
  };
  return {
    repository,
    gateway,
    center: new AuthorizationCenter(dependencies),
  };
}

describe("AuthorizationCenter", () => {
  it("requires and encrypts the initial client secret", async () => {
    const fixture = createFixture();
    await expect(
      fixture.center.saveDraft({
        values,
        expectedVersion: 0,
        updatedByUserId: 7,
      })
    ).rejects.toMatchObject({
      code: HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
    });

    const saved = await fixture.center.saveDraft({
      values,
      clientSecret: "client-secret-1234",
      expectedVersion: 0,
      updatedByUserId: 7,
    });
    expect(saved).toMatchObject({ status: "draft", configVersion: 1 });
    expect(saved.encryptedClientSecret).not.toContain("client-secret-1234");
  });

  it("retains the encrypted secret when saving non-secret configuration", async () => {
    const fixture = createFixture();
    fixture.repository.current = connection();
    const saved = await fixture.center.saveDraft({
      values: { ...values, clientId: "hodor-service-v2" },
      expectedVersion: 1,
      updatedByUserId: 8,
    });
    expect(saved.encryptedClientSecret).toBe("encrypted:client-secret-1234");
    expect(saved.clientId).toBe("hodor-service-v2");
  });

  it("marks a tested draft ready with optimistic versioning", async () => {
    const fixture = createFixture();
    fixture.repository.current = connection();
    const ready = await fixture.center.testConnection({
      expectedVersion: 1,
      updatedByUserId: 7,
      requestId: "request-1",
    });
    expect(fixture.gateway.testCalls).toBe(1);
    expect(ready).toMatchObject({
      status: "ready",
      configVersion: 2,
      lastTestedAtUtc: 1_000,
    });
  });

  it("fails closed until the connection is ready", async () => {
    const fixture = createFixture();
    fixture.repository.current = connection();
    await expect(
      fixture.center.checkPilotDecision({
        requestId: "request-1",
        actor: { userId: 7, roleIds: [1], isSuperAdmin: true },
        decision: {
          action: "read",
          resource: { type: "Document", id: "doc-1", attributes: {} },
          context: {},
        },
      })
    ).rejects.toMatchObject({
      code: HodorAuthorizationErrorCode.CONFIGURATION_NOT_READY,
    });
    expect(fixture.gateway.decisionCalls).toBe(0);
  });

  it("returns a valid allow or deny result from a ready connection", async () => {
    const fixture = createFixture();
    fixture.repository.current = connection({ status: "ready" });
    await expect(
      fixture.center.checkPilotDecision({
        requestId: "request-1",
        actor: { userId: 7, roleIds: [1], isSuperAdmin: true },
        decision: {
          action: "read",
          resource: { type: "Document", id: "doc-1", attributes: {} },
          context: {},
        },
      })
    ).resolves.toEqual(fixture.gateway.decisionResult);
  });
});
