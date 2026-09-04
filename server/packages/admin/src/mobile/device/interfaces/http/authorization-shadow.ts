import {
  observeAuthorizationShadowDecision,
  type ObserveAuthorizationShadowDecisionInput,
} from "../../../../system/authorization/facade.js";

export interface DeviceDetailAuthorizationShadowInput {
  readonly deviceId: number;
  readonly isEnabled: boolean;
  readonly requestId: string;
  readonly actor: {
    readonly userId: number;
    readonly roleIds: readonly number[];
    readonly isSuperAdmin: boolean;
  };
}

export interface DeviceDetailAuthorizationShadowOptions {
  readonly observe?: (
    input: ObserveAuthorizationShadowDecisionInput
  ) => Promise<unknown>;
  readonly waitUntil?: (promise: Promise<unknown>) => void;
}

export function createDeviceDetailAuthorizationShadowDecision(
  input: DeviceDetailAuthorizationShadowInput
): ObserveAuthorizationShadowDecisionInput {
  return {
    requestId: input.requestId,
    rbacAllowed: true,
    actor: {
      userId: input.actor.userId,
      roleIds: input.actor.roleIds,
      isSuperAdmin: input.actor.isSuperAdmin,
    },
    decision: {
      action: "read",
      resource: {
        type: "MobileDevice",
        id: String(input.deviceId),
        attributes: {
          classification: 1,
          status: input.isEnabled ? "active" : "blocked",
        },
      },
      context: {},
    },
  };
}

/**
 * Starts a handled best-effort observation. Worker callers may register it
 * with waitUntil; Node callers safely let the already-handled Promise finish.
 */
export function scheduleDeviceDetailAuthorizationShadow(
  input: DeviceDetailAuthorizationShadowInput,
  options: DeviceDetailAuthorizationShadowOptions = {}
): Promise<void> {
  const observe = options.observe ?? observeAuthorizationShadowDecision;
  const task = Promise.resolve()
    .then(() => observe(createDeviceDetailAuthorizationShadowDecision(input)))
    .then(() => undefined)
    .catch(() => undefined);
  try {
    options.waitUntil?.(task);
  } catch {
    // The handled Promise still runs when Node has no Worker ExecutionContext.
  }
  return task;
}
