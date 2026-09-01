import { describe, expect, it } from "vitest";
import type { AuthorizationConnectionValues } from "../domain/authorization.js";
import { HodorAuthorizationErrorCode } from "../domain/authorization.js";
import {
  createOneAuthorizationGateway,
  type AuthorizationOutboundLogEvent,
} from "./one-authorization-gateway.js";

const connection: AuthorizationConnectionValues = {
  issuer: "https://one.example.com",
  authorizationBaseUrl: "https://one.example.com/authorization/api/v1",
  audience: "https://one.example.com/authorization/api/v1",
  clientId: "hodor-service",
  cloudflareAccessClientId: null,
};

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

function successfulFetch(requests: Request[]) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/openid-configuration") {
      return json({
        issuer: connection.issuer,
        token_endpoint: "https://one.example.com/token",
      });
    }
    if (url.pathname === "/token") {
      return json({
        access_token: "service-access-token",
        token_type: "Bearer",
      });
    }
    if (url.pathname.endsWith("/readyz")) {
      return json({ service: "one-authz", status: "ready" });
    }
    if (url.pathname.endsWith("/decisions/check")) {
      return json({
        data: {
          decisionId: "decision-1",
          allowed: false,
          reason: "POLICY_DENY",
          policyRevision: 3,
        },
        requestId: "request-1",
      });
    }
    return json({ error: "not found" }, 404);
  };
}

describe("one authorization gateway", () => {
  it("tests discovery, Client Credentials and readiness", async () => {
    const requests: Request[] = [];
    const gateway = createOneAuthorizationGateway({
      fetch: successfulFetch(requests),
    });

    await expect(
      gateway.testConnection({
        connection,
        clientSecret: "client-secret-sentinel",
        cloudflareAccess: null,
        requestId: "request-1",
      })
    ).resolves.toBeUndefined();
    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/.well-known/openid-configuration",
      "/token",
      "/authorization/api/v1/readyz",
    ]);
    expect(requests.every((request) => request.redirect === "manual")).toBe(
      true
    );
    expect(await requests[1].clone().text()).toContain(
      "scope=authorization%3Adecide"
    );
  });

  it("returns a strict allow or deny decision and propagates requestId", async () => {
    const requests: Request[] = [];
    const gateway = createOneAuthorizationGateway({
      fetch: successfulFetch(requests),
    });
    const result = await gateway.checkDecision({
      connection,
      clientSecret: "client-secret-sentinel",
      cloudflareAccess: null,
      requestId: "request-1",
      decision: {
        action: "read",
        resource: { type: "Document", id: "doc-1", attributes: {} },
        context: {},
      },
    });

    expect(result).toMatchObject({
      data: { allowed: false, reason: "POLICY_DENY", policyRevision: 3 },
      requestId: "request-1",
    });
    const decisionRequest = requests.at(-1);
    expect(decisionRequest?.headers.get("authorization")).toBe(
      "Bearer service-access-token"
    );
    expect(decisionRequest?.headers.get("x-request-id")).toBe("request-1");
  });

  it("rejects an untrusted discovery token endpoint", async () => {
    const gateway = createOneAuthorizationGateway({
      fetch: async () =>
        json({
          issuer: connection.issuer,
          token_endpoint: "https://attacker.example.com/token",
        }),
    });
    await expect(
      gateway.testConnection({
        connection,
        clientSecret: "client-secret-sentinel",
        cloudflareAccess: null,
        requestId: "request-1",
      })
    ).rejects.toMatchObject({
      code: HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE,
    });
  });

  it("keeps credentials, tokens and bodies out of outbound logs", async () => {
    const requests: Request[] = [];
    const logs: AuthorizationOutboundLogEvent[] = [];
    const gateway = createOneAuthorizationGateway({
      fetch: successfulFetch(requests),
      log: (event) => logs.push(event),
    });
    await gateway.checkDecision({
      connection,
      clientSecret: "client-secret-sentinel",
      cloudflareAccess: {
        clientId: "access-client-id",
        clientSecret: "access-client-secret-sentinel",
      },
      requestId: "request-1",
      decision: {
        action: "read",
        resource: {
          type: "Document",
          id: "sensitive-resource-id",
          attributes: { phone: "sensitive-phone-sentinel" },
        },
        context: {},
      },
    });

    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain("client-secret-sentinel");
    expect(serialized).not.toContain("access-client-secret-sentinel");
    expect(serialized).not.toContain("service-access-token");
    expect(serialized).not.toContain("sensitive-resource-id");
    expect(serialized).not.toContain("sensitive-phone-sentinel");
    expect(logs.map((event) => event.operation)).toEqual([
      "discovery",
      "token",
      "decision",
    ]);
    expect(
      requests.every(
        (request) =>
          request.headers.get("cf-access-client-id") === "access-client-id" &&
          request.headers.get("cf-access-client-secret") ===
            "access-client-secret-sentinel"
      )
    ).toBe(true);
  });
});
