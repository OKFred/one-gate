import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SsoConnection, SsoConnectionValues } from "../domain/sso.js";
import type {
  SsoConfigurationProbePort,
  SsoConfigurationRepositoryPort,
} from "./ports.js";
import { SsoConfigurationCenter } from "./sso-configuration-center.js";

const values: SsoConnectionValues = {
  issuer: "https://sso.example.com/",
  clientId: "hodor-client",
  audience: "urn:hodor",
  allowedTenantId: "tenant-1",
  redirectUris: ["https://gate.example.com/sso/callback?intent=login"],
};

function connection(overrides: Partial<SsoConnection> = {}): SsoConnection {
  return {
    id: "default",
    ...values,
    issuer: "https://sso.example.com",
    status: "draft",
    configVersion: 1,
    lastTestedAtUtc: null,
    updatedByUserId: 1,
    createTimeUtc: 1_000,
    updateTimeUtc: null,
    ...overrides,
  };
}

class FakeRepository implements SsoConfigurationRepositoryPort {
  current: SsoConnection | null = null;

  async findConnection(): Promise<SsoConnection | null> {
    return this.current ? structuredClone(this.current) : null;
  }

  async saveDraft(
    input: Parameters<SsoConfigurationRepositoryPort["saveDraft"]>[0]
  ): Promise<SsoConnection | null> {
    const currentVersion = this.current?.configVersion ?? 0;
    if (currentVersion !== input.expectedVersion) return null;
    this.current = connection({
      ...input.values,
      status: "draft",
      configVersion: currentVersion + 1,
      lastTestedAtUtc: null,
      updatedByUserId: input.updatedByUserId,
      createTimeUtc: this.current?.createTimeUtc ?? input.nowUtc,
      updateTimeUtc: this.current ? input.nowUtc : null,
    });
    return structuredClone(this.current);
  }

  async markReady(
    input: Parameters<SsoConfigurationRepositoryPort["markReady"]>[0]
  ): Promise<SsoConnection | null> {
    if (
      !this.current ||
      this.current.status !== "draft" ||
      this.current.configVersion !== input.expectedVersion
    ) {
      return null;
    }
    this.current = {
      ...this.current,
      status: "ready",
      configVersion: input.expectedVersion + 1,
      lastTestedAtUtc: input.testedAtUtc,
      updatedByUserId: input.updatedByUserId,
      updateTimeUtc: input.testedAtUtc,
    };
    return structuredClone(this.current);
  }

  async disable(
    input: Parameters<SsoConfigurationRepositoryPort["disable"]>[0]
  ): Promise<SsoConnection | null> {
    if (!this.current || this.current.configVersion !== input.expectedVersion) {
      return null;
    }
    this.current = {
      ...this.current,
      status: "disabled",
      configVersion: input.expectedVersion + 1,
      updatedByUserId: input.updatedByUserId,
      updateTimeUtc: input.nowUtc,
    };
    return structuredClone(this.current);
  }
}

describe("SsoConfigurationCenter", () => {
  let repository: FakeRepository;
  let probe: SsoConfigurationProbePort;
  let center: SsoConfigurationCenter;
  let now: number;

  beforeEach(() => {
    repository = new FakeRepository();
    probe = { testConfiguration: vi.fn().mockResolvedValue(undefined) };
    now = 2_000;
    center = new SsoConfigurationCenter({
      repository,
      probe,
      clock: { now: () => now },
      policy: { allowInsecureLocalhost: false },
    });
  });

  it("saves normalized values as a draft", async () => {
    await expect(
      center.saveDraft({ values, expectedVersion: 0, updatedByUserId: 7 })
    ).resolves.toMatchObject({
      issuer: "https://sso.example.com",
      status: "draft",
      configVersion: 1,
    });
  });

  it("tests one exact draft version before marking it ready", async () => {
    repository.current = connection();

    await expect(
      center.test({
        expectedVersion: 1,
        updatedByUserId: 7,
        requestId: "request-1",
      })
    ).resolves.toMatchObject({
      status: "ready",
      configVersion: 2,
      lastTestedAtUtc: 2_000,
    });
    expect(probe.testConfiguration).toHaveBeenCalledWith({
      requestId: "request-1",
      configuration: expect.objectContaining({
        issuer: "https://sso.example.com",
        tenantId: "tenant-1",
      }),
    });
  });

  it("does not activate a version changed during the probe", async () => {
    repository.current = connection();
    vi.mocked(probe.testConfiguration).mockImplementation(async () => {
      repository.current = connection({ configVersion: 2 });
    });

    await expect(
      center.test({
        expectedVersion: 1,
        updatedByUserId: 7,
        requestId: "request-1",
      })
    ).rejects.toMatchObject({ code: "CONFIGURATION_CONFLICT" });
  });

  it("fails closed for stale save, test and disable versions", async () => {
    repository.current = connection({ configVersion: 3 });

    await expect(
      center.saveDraft({ values, expectedVersion: 2, updatedByUserId: 7 })
    ).rejects.toMatchObject({ code: "CONFIGURATION_CONFLICT" });
    await expect(
      center.test({
        expectedVersion: 2,
        updatedByUserId: 7,
        requestId: "request-1",
      })
    ).rejects.toMatchObject({ code: "CONFIGURATION_CONFLICT" });
    await expect(
      center.disable({ expectedVersion: 2, updatedByUserId: 7 })
    ).rejects.toMatchObject({ code: "CONFIGURATION_CONFLICT" });
  });
});
