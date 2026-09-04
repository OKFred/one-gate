import { describe, expect, it, vi } from "vitest";
import type { SsoConfigurationRepositoryPort } from "../application/ports.js";
import type { SsoConnection } from "../domain/sso.js";
import { createDatabaseFirstSsoConfigurationResolver } from "./configuration.js";

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

describe("database-first SSO configuration", () => {
  it("uses a ready database connection without reading legacy values", async () => {
    const legacyConfiguration = vi.fn();
    const resolve = createDatabaseFirstSsoConfigurationResolver({
      repository: repositoryWith(readyConnection),
      policy: { allowInsecureLocalhost: false },
      legacyConfiguration,
    });

    await expect(resolve()).resolves.toMatchObject({
      issuer: "https://database-sso.example.com",
      clientId: "database-client",
      tenantId: "database-tenant",
    });
    expect(legacyConfiguration).not.toHaveBeenCalled();
  });

  it("falls back only when the database has no connection row", async () => {
    const legacyConfiguration = vi.fn().mockReturnValue({
      issuer: "https://legacy-sso.example.com",
      clientId: "legacy-client",
      audience: "urn:legacy",
      tenantId: "legacy-tenant",
      redirectUris: ["https://legacy.example.com/sso/callback"],
      allowInsecureLocalhost: false,
    });
    const resolve = createDatabaseFirstSsoConfigurationResolver({
      repository: repositoryWith(null),
      policy: { allowInsecureLocalhost: false },
      legacyConfiguration,
    });

    await expect(resolve()).resolves.toMatchObject({
      issuer: "https://legacy-sso.example.com",
    });
    expect(legacyConfiguration).toHaveBeenCalledOnce();
  });

  it.each(["draft", "disabled"] as const)(
    "fails closed for a %s row instead of using legacy values",
    async (status) => {
      const legacyConfiguration = vi.fn();
      const resolve = createDatabaseFirstSsoConfigurationResolver({
        repository: repositoryWith({ ...readyConnection, status }),
        policy: { allowInsecureLocalhost: false },
        legacyConfiguration,
      });

      await expect(resolve()).rejects.toMatchObject({
        code: "CONFIGURATION_NOT_READY",
      });
      expect(legacyConfiguration).not.toHaveBeenCalled();
    }
  );
});
