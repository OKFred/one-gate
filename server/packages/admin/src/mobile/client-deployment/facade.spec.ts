import { afterEach, describe, expect, it, vi } from "vitest";

import type { DeviceDeploymentEvent } from "./domain/deployment.js";
import { processIncomingDeploymentEvent } from "./facade.js";
import type { MobileClientDeployment } from "./model.js";
import { clientDeploymentRepository } from "./repository.js";

const current = {
  id: 1,
  deploymentId: "11111111-1111-4111-8111-111111111111",
  clientId: "phone-001",
  activeClientId: "phone-001",
  releaseId: 2,
  releaseVersion: "v2.1.5",
  releaseDigest: "a".repeat(64),
  environmentRevisionId: 3,
  environment: "development",
  environmentRevision: 1,
  activationMode: "GRACEFUL",
  drainTimeoutMs: 900_000,
  phase: "PENDING",
  previousReleaseVersion: "v2.1.3",
  previousReleaseDigest: "b".repeat(64),
  previousEnvironment: "development",
  previousEnvironmentRevision: 1,
  resultCode: null,
  resultMessage: null,
  expiresAtUtc: 10_000,
  startedAtUtc: null,
  finishedAtUtc: null,
  creatorId: 1,
  updaterId: null,
  createTimeUtc: 1,
  updateTimeUtc: null,
} as const satisfies MobileClientDeployment;

const event = {
  protocolVersion: 1,
  deploymentId: current.deploymentId,
  deviceId: current.clientId,
  phase: "VERIFYING",
  code: "DEPLOYMENT_VERIFYING",
  message: "health checks started",
  releaseVersion: current.releaseVersion,
  environment: current.environment,
  environmentRevision: current.environmentRevision,
  timestamp: 2,
} as const satisfies DeviceDeploymentEvent;

describe("client deployment event facade", () => {
  afterEach(() => vi.restoreAllMocks());

  it("applies identity-matched forward progress even when MQTT phases were lost", async () => {
    vi.spyOn(clientDeploymentRepository, "getDeployment").mockResolvedValue(
      current
    );
    vi.spyOn(
      clientDeploymentRepository,
      "applyDeploymentEvent"
    ).mockResolvedValue(true);

    await expect(processIncomingDeploymentEvent(event)).resolves.toBe(
      "APPLIED"
    );
  });

  it("treats the same phase as an idempotent duplicate", async () => {
    vi.spyOn(clientDeploymentRepository, "getDeployment").mockResolvedValue({
      ...current,
      phase: "VERIFYING",
    });
    const apply = vi.spyOn(clientDeploymentRepository, "applyDeploymentEvent");

    await expect(processIncomingDeploymentEvent(event)).resolves.toBe(
      "DUPLICATE"
    );
    expect(apply).not.toHaveBeenCalled();
  });

  it("rejects unknown deployments and identity mismatches", async () => {
    const get = vi.spyOn(clientDeploymentRepository, "getDeployment");
    get.mockResolvedValueOnce(undefined).mockResolvedValueOnce(current);

    await expect(processIncomingDeploymentEvent(event)).resolves.toBe(
      "REJECTED"
    );
    await expect(
      processIncomingDeploymentEvent({ ...event, deviceId: "phone-002" })
    ).resolves.toBe("REJECTED");
  });
});
