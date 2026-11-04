import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  connect: vi.fn(),
  audit: vi.fn(),
  brokerUrl: "mqtts://broker.example.test:8883",
}));
vi.mock("mqtt", () => ({ default: { connectAsync: state.connect } }));
vi.mock("../base/sys_config/repository.js", () => ({
  findPrimaryByNamespace: async () => null,
  findByNamespace: async () => [],
}));
vi.mock("./driver.js", () => ({
  getMqttConnectionInfo: () => ({
    brokerUrl: state.brokerUrl,
    clientId: "synthetic-control",
    username: "synthetic",
    password: "synthetic-fixture-only",
    keepalive: 30,
    cleanSession: true,
  }),
}));
vi.mock("../base/log/service.js", () => ({
  default: { biz: { add: state.audit } },
}));
import { publishDeviceManagementCommand } from "./service.js";

function input() {
  return {
    topic: "autojs6/v2/devices/synthetic-device/task-control",
    payload: {
      protocolVersion: 2,
      action: "CANCEL",
      commandId: "synthetic-command",
      taskId: "synthetic-task",
      createdAt: 1_000,
      expiresAt: 31_000,
    },
    actor: { userId: 42, username: "synthetic-operator" },
    sessionId: "synthetic-command",
    clientId: "synthetic-device",
    commandType: "TASK_CANCEL",
    requireTls: true as const,
  };
}
function client() {
  return { publishAsync: vi.fn(async () => undefined), end: vi.fn() };
}

describe("secure task cancellation transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.brokerUrl = "mqtts://broker.example.test:8883";
    state.audit.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("requires TLS verification and publishes once with QoS1 and no retain", async () => {
    const connection = client();
    state.connect.mockResolvedValue(connection);
    await publishDeviceManagementCommand(input());
    expect(state.connect).toHaveBeenCalledWith(
      "wss://broker.example.test:8084/mqtt",
      expect.objectContaining({ rejectUnauthorized: true, reconnectPeriod: 0 })
    );
    expect(connection.publishAsync).toHaveBeenCalledExactlyOnceWith(
      input().topic,
      JSON.stringify(input().payload),
      { qos: 1, retain: false }
    );
    expect(connection.end).toHaveBeenCalledWith(true);
    expect(state.audit.mock.calls[0][0].logValue.payload).toBe(
      "[REDACTED_DEVICE_MANAGEMENT_COMMAND]"
    );
  });

  it("never falls back to plaintext MQTT after encrypted transports fail", async () => {
    state.brokerUrl = "mqtt://broker.example.test:1883";
    state.connect.mockRejectedValue(new Error("TLS unavailable"));
    await expect(publishDeviceManagementCommand(input())).rejects.toThrow(
      "SECURE_DEVICE_COMMAND_TRANSPORT_FAILED"
    );
    expect(state.connect).toHaveBeenCalledTimes(2);
    for (const [url, options] of state.connect.mock.calls) {
      expect(url).toMatch(/^wss:\/\//);
      expect(options.rejectUnauthorized).toBe(true);
    }
  });

  it("uses distinct client IDs for simultaneous control connections", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    state.connect.mockResolvedValue(client());
    await Promise.all([
      publishDeviceManagementCommand(input()),
      publishDeviceManagementCommand(input()),
    ]);
    expect(state.connect.mock.calls[0][1].clientId).not.toBe(
      state.connect.mock.calls[1][1].clientId
    );
    vi.restoreAllMocks();
  });

  it("does not retry a write with a lost publish acknowledgement", async () => {
    const connection = client();
    connection.publishAsync.mockRejectedValue(
      new Error("acknowledgement lost")
    );
    state.connect.mockResolvedValue(connection);
    await expect(publishDeviceManagementCommand(input())).rejects.toThrow();
    expect(state.connect).toHaveBeenCalledTimes(1);
    expect(connection.publishAsync).toHaveBeenCalledTimes(1);
    expect(connection.end).toHaveBeenCalledWith(true);
  });

  it("bounds a missing PUBACK, closes the connection and never retries the write", async () => {
    vi.useFakeTimers();
    const connection = client();
    connection.publishAsync.mockImplementation(
      () => new Promise(() => undefined)
    );
    state.connect.mockResolvedValue(connection);
    const outcome = publishDeviceManagementCommand(input()).catch(
      (error: unknown) => error
    );
    await vi.advanceTimersByTimeAsync(8001);
    expect(await outcome).toMatchObject({
      message: expect.stringContaining(
        "SECURE_DEVICE_COMMAND_TRANSPORT_FAILED"
      ),
    });
    expect(state.connect).toHaveBeenCalledTimes(1);
    expect(connection.publishAsync).toHaveBeenCalledTimes(1);
    expect(connection.end).toHaveBeenCalledExactlyOnceWith(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("closes a connection that arrives after the connection timeout", async () => {
    vi.useFakeTimers();
    state.brokerUrl = "wss://broker.example.test/mqtt";
    let resolveConnection:
      | ((value: ReturnType<typeof client>) => void)
      | undefined;
    state.connect.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConnection = resolve;
        })
    );
    const outcome = publishDeviceManagementCommand(input()).catch(
      (error: unknown) => error
    );
    await vi.advanceTimersByTimeAsync(8_001);
    expect(await outcome).toBeInstanceOf(Error);
    const late = client();
    resolveConnection?.(late);
    await vi.advanceTimersByTimeAsync(0);
    expect(late.end).toHaveBeenCalledWith(true);
    expect(late.publishAsync).not.toHaveBeenCalled();
  });
});
