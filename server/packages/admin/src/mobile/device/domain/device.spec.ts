import { describe, expect, it } from "vitest";
import {
  DEVICE_EVENT_FUTURE_TOLERANCE_MS,
  DEVICE_EVENT_RETENTION_MS,
  DEVICE_ONLINE_THRESHOLD_MS,
  DeviceRuleViolation,
  assertReportJsonSize,
  isEffectivelyOnline,
  maskIdentifier,
  normalizeDeviceIdentifiers,
  projectDeviceEvent,
  projectPresence,
  validateCapabilities,
  type DeviceEventInput,
} from "./device.js";

const now = 2_000_000_000_000;

function event(overrides: Partial<DeviceEventInput> = {}): DeviceEventInput {
  return {
    protocolVersion: 2,
    eventId: "12345678-1234-1234-1234-123456789abc",
    deviceId: "device-01",
    type: "battery",
    timestamp: now,
    data: { level: 47.6, isCharging: true },
    ...overrides,
  };
}

describe("设备领域规则", () => {
  it("按 150 秒边界判定有效在线", () => {
    expect(
      isEffectivelyOnline(
        {
          reportedStatus: "ONLINE",
          lastHeartbeatTimeUtc: now - DEVICE_ONLINE_THRESHOLD_MS,
        },
        now
      )
    ).toBe(true);
    expect(
      isEffectivelyOnline(
        {
          reportedStatus: "ONLINE",
          lastHeartbeatTimeUtc: now - DEVICE_ONLINE_THRESHOLD_MS - 1,
        },
        now
      )
    ).toBe(false);
    expect(
      isEffectivelyOnline(
        { reportedStatus: "OFFLINE", lastHeartbeatTimeUtc: now },
        now
      )
    ).toBe(false);
  });

  it("Presence 使用服务端时间更新在线与离线快照", () => {
    const base = {
      reportedStatus: "OFFLINE" as const,
      lastHeartbeatTimeUtc: 100,
      lastOnlineTimeUtc: 90,
      lastOfflineTimeUtc: 95,
    };
    expect(
      projectPresence(
        base,
        {
          protocolVersion: 2,
          deviceId: "device-01",
          status: "ONLINE",
          timestamp: 1,
        },
        now
      )
    ).toEqual({
      reportedStatus: "ONLINE",
      lastHeartbeatTimeUtc: now,
      lastOnlineTimeUtc: now,
      lastOfflineTimeUtc: 95,
      protocolVersion: 2,
    });
    expect(
      projectPresence(
        { ...base, reportedStatus: "ONLINE" },
        {
          protocolVersion: 2,
          deviceId: "device-01",
          status: "OFFLINE",
          timestamp: 1,
        },
        now
      )
    ).toMatchObject({
      reportedStatus: "OFFLINE",
      lastHeartbeatTimeUtc: 100,
      lastOfflineTimeUtc: now,
    });
  });

  it("校验并规范化可信脚本能力", () => {
    expect(
      validateCapabilities({
        root: false,
        trustedScripts: [{ scriptId: "device.apps.list", version: 2 }],
      })
    ).toEqual({
      root: false,
      trustedScripts: [{ scriptId: "device.apps.list", version: 2 }],
    });
    expect(() =>
      validateCapabilities({ root: "no", trustedScripts: [] })
    ).toThrow("Invalid device capabilities");
    expect(() =>
      validateCapabilities({
        root: false,
        trustedScripts: [{ scriptId: "bad script", version: 0 }],
      })
    ).toThrow("Invalid trusted script capability");
    expect(
      validateCapabilities({
        root: true,
        trustedScripts: [],
        ops: {
          protocolVersion: 1,
          enabled: true,
          arbitraryShell: false,
          operations: ["device.screen.capture"],
        },
      }).ops?.operations
    ).toEqual(["device.screen.capture"]);
  });

  it("去重 IMEI 并约束标识符状态一致", () => {
    expect(
      normalizeDeviceIdentifiers({
        imeis: ["123456789012345", "123456789012345"],
        imeiStatus: "available",
        serialNumber: "serial-01",
        serialStatus: "available",
      })
    ).toEqual({
      imeis: ["123456789012345"],
      imeiStatus: "available",
      serialNumber: "serial-01",
      serialStatus: "available",
    });
    expect(() =>
      normalizeDeviceIdentifiers({
        imeis: [],
        imeiStatus: "available",
        serialNumber: null,
        serialStatus: "unavailable",
      })
    ).toThrow("IMEI status does not match collected values");
    expect(() =>
      normalizeDeviceIdentifiers({
        imeis: ["not-imei"],
        imeiStatus: "available",
        serialNumber: null,
        serialStatus: "unavailable",
      })
    ).toThrow("Invalid IMEI value");
  });

  it("限制扩展 JSON 为 32 KiB", () => {
    expect(() => assertReportJsonSize({ ok: true }, "data")).not.toThrow();
    expect(() =>
      assertReportJsonSize({ text: "x".repeat(33 * 1024) }, "data")
    ).toThrow("data exceeds 32 KiB");
  });

  it("battery 与 network 事件生成可公开快照", () => {
    expect(projectDeviceEvent(event(), now)).toEqual({
      summary: { level: 48, isCharging: true },
      snapshot: { batteryLevel: 48, isCharging: true },
      sensitive: false,
    });
    expect(
      projectDeviceEvent(
        event({
          type: "network",
          data: { isConnected: true, type: "wifi" },
        }),
        now
      )
    ).toEqual({
      summary: { isConnected: true, type: "wifi" },
      snapshot: { networkConnected: true, networkType: "wifi" },
      sensitive: false,
    });
  });

  it("sms 与 notification 只生成脱敏摘要", () => {
    expect(
      projectDeviceEvent(
        event({
          type: "sms",
          data: { address: "13800138000", body: "secret" },
        }),
        now
      )
    ).toEqual({
      summary: { addressMasked: "*******8000", bodyLength: 6 },
      snapshot: {},
      sensitive: true,
    });
    expect(
      projectDeviceEvent(
        event({
          type: "notification",
          data: { packageName: "com.example", title: "title", text: "body" },
        }),
        now
      )
    ).toEqual({
      summary: {
        packageName: "com.example",
        titleLength: 5,
        textLength: 4,
      },
      snapshot: {},
      sensitive: true,
    });
  });

  it("拒绝非法事件标识与时间窗", () => {
    expect(() => projectDeviceEvent(event({ eventId: "bad" }), now)).toThrow(
      DeviceRuleViolation
    );
    expect(() =>
      projectDeviceEvent(
        event({ timestamp: now - DEVICE_EVENT_RETENTION_MS - 1 }),
        now
      )
    ).toThrow("Invalid device event timestamp");
    expect(() =>
      projectDeviceEvent(
        event({ timestamp: now + DEVICE_EVENT_FUTURE_TOLERANCE_MS + 1 }),
        now
      )
    ).toThrow("Invalid device event timestamp");
  });

  it("标识符只展示尾四位", () => {
    expect(maskIdentifier("1234567890")).toBe("******7890");
    expect(maskIdentifier("1234")).toBe("****");
  });
});
