import type { UserObj } from "@hodor/core/types/app";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationCenter } from "../../application/authorization-center.js";
import type { AuthorizationConnection } from "../../domain/authorization.js";
import {
  onAuthorizationConfigurationGet,
  onAuthorizationPilotCheck,
  toAuthorizationConnectionSummary,
  type AuthorizationRequestContext,
} from "./service.js";

const connection: AuthorizationConnection = {
  id: "default",
  issuer: "https://one.example.com",
  authorizationBaseUrl: "https://one.example.com/authorization/api/v1",
  audience: "https://one.example.com/authorization/api/v1",
  clientId: "hodor-service",
  encryptedClientSecret: "ciphertext-secret-sentinel",
  status: "ready",
  configVersion: 2,
  lastTestedAtUtc: 2_000,
  updatedByUserId: 7,
  createTimeUtc: 1_000,
  updateTimeUtc: 2_000,
};

function admin(): Pick<
  UserObj,
  "ensureLoaded" | "isSuperAdmin" | "roleIds" | "userId"
> {
  return {
    userId: 7,
    roleIds: [1],
    isSuperAdmin: true,
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
  };
}

function context(): AuthorizationRequestContext {
  return {
    get: () => "request-1",
  };
}

describe("Authorization HTTP service", () => {
  it("never exposes encrypted Client Secret in summaries", () => {
    const summary = toAuthorizationConnectionSummary(connection);
    expect(summary).toMatchObject({
      configured: true,
      hasClientSecret: true,
      status: "ready",
    });
    expect(JSON.stringify(summary)).not.toContain("ciphertext-secret-sentinel");
  });

  it("requires a Hodor super administrator", async () => {
    const user = { ...admin(), isSuperAdmin: false };
    const center = {
      getConnection: vi.fn().mockResolvedValue(connection),
    } as Pick<AuthorizationCenter, "getConnection">;
    await expect(
      onAuthorizationConfigurationGet({}, user, context(), center)
    ).rejects.toMatchObject({ status: 403 });
    expect(center.getConnection).not.toHaveBeenCalled();
  });

  it("maps a service-principal deny without turning it into an error", async () => {
    const checkPilotDecision = vi.fn().mockResolvedValue({
      data: {
        decisionId: "decision-1",
        allowed: false,
        reason: "POLICY_DENY",
        policyRevision: 3,
      },
      requestId: "authorization-request-1",
    });
    const result = await onAuthorizationPilotCheck(
      {
        action: "read",
        resource: { type: "Document", id: "doc-1", attributes: {} },
        context: {},
      },
      admin(),
      context(),
      { checkPilotDecision }
    );

    expect(result).toEqual({
      decisionId: "decision-1",
      allowed: false,
      reason: "POLICY_DENY",
      policyRevision: 3,
      authorizationRequestId: "authorization-request-1",
    });
    expect(checkPilotDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-1",
        actor: { userId: 7, roleIds: [1], isSuperAdmin: true },
      })
    );
  });

  it("accepts an omitted context and rejects requests above 64 KiB", async () => {
    const checkPilotDecision = vi.fn().mockResolvedValue({
      data: {
        decisionId: "decision-1",
        allowed: false,
        reason: "POLICY_DENY",
        policyRevision: 3,
      },
      requestId: "authorization-request-1",
    });
    await expect(
      onAuthorizationPilotCheck(
        {
          action: "read",
          resource: { type: "Document", id: "doc-1", attributes: {} },
        },
        admin(),
        context(),
        { checkPilotDecision }
      )
    ).resolves.toMatchObject({ allowed: false });
    expect(checkPilotDecision).toHaveBeenLastCalledWith(
      expect.objectContaining({
        decision: expect.objectContaining({ context: {} }),
      })
    );

    await expect(
      onAuthorizationPilotCheck(
        {
          action: "read",
          resource: {
            type: "Document",
            id: "doc-1",
            attributes: { oversized: "x".repeat(65_536) },
          },
        },
        admin(),
        context(),
        { checkPilotDecision }
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(checkPilotDecision).toHaveBeenCalledTimes(1);
  });
});
