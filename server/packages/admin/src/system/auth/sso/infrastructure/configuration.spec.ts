import { describe, expect, it, vi } from "vitest";
import type { SsoConfigurationRepositoryPort } from "../application/ports.js";
import type { SsoConnection } from "../domain/sso.js";
import { createDatabaseSsoConfigurationResolver } from "./configuration.js";

const readyConnection: SsoConnection = {
  id: "default",
  issuer: "https://database-sso.example.com",
  clientId: "database-client",
  audience: "urn:database",
  allowedTenantId: "database-tenant",
  redirectUris: ["https://gate.example.com/sso/callback"],
  status: "ready",
  configVersion: 2,
  lastTestedAtUtc: 1_000,
  updatedByUserId: 1,
  createTimeUtc: 500,
  updateTimeUtc: 1_000,
};

function repositoryWith(
  connection: SsoConnection | null
): SsoConfigurationRepositoryPort {
  return {
    findConnection: vi.fn().mockResolvedValue(connection),
    saveDraft: vi.fn(),
    markReady: vi.fn(),
    disable: vi.fn(),
  };
}

describe("database-backed SSO configuration", () => {
  it("uses a ready database connection", async () => {
    const resolve = createDatabaseSsoConfigurationResolver({
      repository: repositoryWith(readyConnection),
      policy: { allowInsecureLocalhost: false },
    });

    await expect(resolve()).resolves.toMatchObject({
      issuer: "https://database-sso.example.com",
      clientId: "database-client",
      tenantId: "database-tenant",
    });
  });

  it("fails closed when the database has no connection row", async () => {
    const resolve = createDatabaseSsoConfigurationResolver({
      repository: repositoryWith(null),
      policy: { allowInsecureLocalhost: false },
    });

    await expect(resolve()).rejects.toMatchObject({
      code: "CONFIGURATION_NOT_READY",
    });
  });

  it.each(["draft", "disabled"] as const)(
    "fails closed for a %s row",
    async (status) => {
      const resolve = createDatabaseSsoConfigurationResolver({
        repository: repositoryWith({ ...readyConnection, status }),
        policy: { allowInsecureLocalhost: false },
      });

      await expect(resolve()).rejects.toMatchObject({
        code: "CONFIGURATION_NOT_READY",
      });
    }
  );
});
