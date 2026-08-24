import { describe, expect, it } from "vitest";

import {
  assertEnvironmentConfig,
  canApplyDeploymentEvent,
  isStaleDeploymentPhase,
  normalizeRequiredSecretKeys,
  parseDeviceDeploymentEvent,
} from "./deployment.js";

const event = {
  protocolVersion: 1 as const,
  deploymentId: "11111111-1111-4111-8111-111111111111",
  deviceId: "phone-001",
  phase: "STAGING" as const,
  code: "STAGING_STARTED",
  message: "started",
  releaseVersion: "v2.0.0",
  environment: "production" as const,
  environmentRevision: 1,
  timestamp: 1,
};

describe("client deployment domain", () => {
  it("rejects management and secret fields in environment templates", () => {
    expect(() => assertEnvironmentConfig({ mqtt: {} })).toThrow();
    expect(() => assertEnvironmentConfig({ apiToken: "secret" })).toThrow();
    expect(() =>
      assertEnvironmentConfig({ tasks: { queueLimit: 20 } })
    ).not.toThrow();
  });

  it("deduplicates local secret key declarations and protects management keys", () => {
    expect(
      normalizeRequiredSecretKeys(["BUSINESS_KEY", "BUSINESS_KEY"])
    ).toEqual(["BUSINESS_KEY"]);
    expect(() => normalizeRequiredSecretKeys(["EMQX_PASSWORD"])).toThrow();
  });

  it("accepts only identity-matched forward transitions", () => {
    const parsed = parseDeviceDeploymentEvent(event);
    expect(parsed).not.toBeNull();
    expect(
      canApplyDeploymentEvent("PENDING", event, {
        deploymentId: event.deploymentId,
        clientId: event.deviceId,
        releaseVersion: event.releaseVersion,
        environment: event.environment,
        environmentRevision: event.environmentRevision,
      })
    ).toBe(true);
    expect(
      canApplyDeploymentEvent(
        "PENDING",
        { ...event, phase: "VERIFYING" },
        {
          deploymentId: event.deploymentId,
          clientId: event.deviceId,
          releaseVersion: event.releaseVersion,
          environment: event.environment,
          environmentRevision: event.environmentRevision,
        }
      )
    ).toBe(true);
    expect(
      canApplyDeploymentEvent("VERIFYING", event, {
        deploymentId: event.deploymentId,
        clientId: event.deviceId,
        releaseVersion: event.releaseVersion,
        environment: event.environment,
        environmentRevision: event.environmentRevision,
      })
    ).toBe(false);
    expect(
      canApplyDeploymentEvent("SUCCEEDED", event, {
        deploymentId: event.deploymentId,
        clientId: event.deviceId,
        releaseVersion: event.releaseVersion,
        environment: event.environment,
        environmentRevision: event.environmentRevision,
      })
    ).toBe(false);
    expect(
      canApplyDeploymentEvent("PENDING", event, {
        deploymentId: event.deploymentId,
        clientId: "another-device",
        releaseVersion: event.releaseVersion,
        environment: event.environment,
        environmentRevision: event.environmentRevision,
      })
    ).toBe(false);
  });

  it("classifies only covered phases from the valid activation branch as stale", () => {
    expect(isStaleDeploymentPhase("VERIFYING", "DRAINING", "GRACEFUL")).toBe(
      true
    );
    expect(isStaleDeploymentPhase("VERIFYING", "PREEMPTING", "GRACEFUL")).toBe(
      false
    );
    expect(isStaleDeploymentPhase("SUCCEEDED", "VERIFYING", "GRACEFUL")).toBe(
      true
    );
    expect(isStaleDeploymentPhase("SUCCEEDED", "FAILED", "GRACEFUL")).toBe(
      false
    );
  });
});
