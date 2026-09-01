import { describe, expect, it } from "vitest";
import {
  attachHodorActor,
  createAuthorizationConnectionValues,
  HodorAuthorizationErrorCode,
  validateAuthorizationDecisionInput,
} from "./authorization.js";

describe("Hodor authorization domain", () => {
  it("normalizes secure database-backed connection values", () => {
    expect(
      createAuthorizationConnectionValues(
        {
          issuer: "https://one.example.com/",
          authorizationBaseUrl: "https://one.example.com/authorization/api/v1/",
          audience: "https://one.example.com/authorization/api/v1/",
          clientId: "hodor-service",
          cloudflareAccessClientId: " access-client-id ",
        },
        { allowInsecureLocalhost: false }
      )
    ).toEqual({
      issuer: "https://one.example.com",
      authorizationBaseUrl: "https://one.example.com/authorization/api/v1",
      audience: "https://one.example.com/authorization/api/v1",
      clientId: "hodor-service",
      cloudflareAccessClientId: "access-client-id",
    });
  });

  it("only permits insecure HTTP for local development", () => {
    const values = {
      issuer: "http://localhost:8790",
      authorizationBaseUrl: "http://127.0.0.1:8790/authorization/api/v1",
      audience: "http://localhost:8790/authorization/api/v1",
      clientId: "hodor-service",
      cloudflareAccessClientId: null,
    };
    expect(() =>
      createAuthorizationConnectionValues(values, {
        allowInsecureLocalhost: false,
      })
    ).toThrowError(
      expect.objectContaining({
        code: HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
      })
    );
    expect(() =>
      createAuthorizationConnectionValues(values, {
        allowInsecureLocalhost: true,
      })
    ).not.toThrow();
  });

  it("rejects caller-controlled reserved context", () => {
    expect(() =>
      validateAuthorizationDecisionInput({
        action: "read",
        resource: { type: "Document", id: "doc-1", attributes: {} },
        context: { hodorActor: { userId: "999" } },
      })
    ).toThrowError(
      expect.objectContaining({
        code: HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
      })
    );
  });

  it("adds a canonical server-owned Hodor actor context", () => {
    expect(
      attachHodorActor(
        {
          action: "read",
          resource: {
            type: "Document",
            id: "doc-1",
            attributes: { classification: 2 },
          },
          context: { source: "admin" },
        },
        { userId: 7, roleIds: [3, 1, 3], isSuperAdmin: false }
      )
    ).toMatchObject({
      context: {
        source: "admin",
        hodorActor: {
          userId: "7",
          roleIds: [1, 3],
          isSuperAdmin: false,
        },
      },
    });
  });
});
