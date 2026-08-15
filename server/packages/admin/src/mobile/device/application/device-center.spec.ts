import { beforeEach, describe, expect, it } from "vitest";
import type {
  DeviceAdminUpdateRecord,
  DeviceCreateRecord,
  DeviceCryptoPort,
  DeviceEventListParams,
  DeviceEventPage,
  DeviceEventRecord,
  DeviceListParams,
  DevicePage,
  DeviceRecord,
  DeviceRepositoryPort,
  DeviceSnapshotUpdate,
} from "./ports.js";
import { DeviceApplicationError } from "./error.js";
import { DeviceCenter } from "./device-center.js";

const now = 2_000_000_000_000;

function createDevice(overrides: Partial<DeviceRecord> = {}): DeviceRecord {
  return {
    id: 1,
    clientId: "device-01",
    deviceName: "Pixel",
    isEnabled: true,
    remark: null,
    reportedStatus: null,
    lastHeartbeatTimeUtc: null,
    lastOnlineTimeUtc: null,
    lastOfflineTimeUtc: null,
    manufacturer: null,
    brand: null,
    model: null,
    androidVersion: null,
    androidSdk: null,
    autojs6Version: null,
    clientVersion: null,
    protocolVersion: null,
    batteryLevel: null,
    isCharging: null,
    networkConnected: null,
    networkType: null,
    imeiStatus: null,
    imeiMaskedJson: null,
    imeiCiphertext: null,
    serialStatus: null,
    serialMasked: null,
    serialCiphertext: null,
    capabilitiesJson: null,
    reportedExtraJson: null,
    customMetadataJson: null,
    customSensitiveMetadataCiphertext: null,
    reportTokenHash: "token-hash",
    creatorId: 7,
    updaterId: null,
    createTimeUtc: now - 10_000,
    updateTimeUtc: null,
    ...overrides,
  };
}

class FakeRepository implements DeviceRepositoryPort {
  readonly devices = new Map<number, DeviceRecord>();
  readonly devicesByClientId = new Map<string, DeviceRecord>();
  readonly addCalls: DeviceCreateRecord[] = [];
  readonly updateCalls: DeviceAdminUpdateRecord[] = [];
  readonly snapshotCalls: Array<{
    clientId: string;
    data: DeviceSnapshotUpdate;
  }> = [];
  readonly eventInsertCalls: Array<
    Omit<DeviceEventRecord, "id" | "createTimeUtc">
  > = [];
  readonly events = new Map<number, DeviceEventRecord>();
  insertEventResult = true;
  markTimedOutResult = 0;
  deleteExpiredResult = 0;
  markTimedOutCall: { cutoff: number; now: number } | undefined;
  deleteExpiredCutoff: number | undefined;

  put(device: DeviceRecord): void {
    this.devices.set(device.id, device);
    this.devicesByClientId.set(device.clientId, device);
  }

  async add(data: DeviceCreateRecord): Promise<number> {
    this.addCalls.push(data);
    return 10;
  }

  async update(data: DeviceAdminUpdateRecord): Promise<void> {
    this.updateCalls.push(data);
  }

  async updateSnapshot(
    clientId: string,
    data: DeviceSnapshotUpdate
  ): Promise<void> {
    this.snapshotCalls.push({ clientId, data });
  }

  async delete(id: number): Promise<void> {
    this.devices.delete(id);
  }

  async getById(id: number): Promise<DeviceRecord | undefined> {
    return this.devices.get(id);
  }

  async getByClientId(clientId: string): Promise<DeviceRecord | undefined> {
    return this.devicesByClientId.get(clientId);
  }

  async list(params: DeviceListParams): Promise<DevicePage> {
    const list = [...this.devices.values()];
    return {
      list,
      total: list.length,
      totalPage: list.length > 0 ? 1 : 0,
      currentPage: params.pageNo,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    };
  }

  async insertEvent(
    data: Omit<DeviceEventRecord, "id" | "createTimeUtc">
  ): Promise<boolean> {
    this.eventInsertCalls.push(data);
    return this.insertEventResult;
  }

  async listEvents(params: DeviceEventListParams): Promise<DeviceEventPage> {
    const list = [...this.events.values()].filter(
      (event) => event.clientId === params.clientId
    );
    return {
      list,
      total: list.length,
      totalPage: list.length > 0 ? 1 : 0,
      currentPage: params.pageNo,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    };
  }

  async getEventById(id: number): Promise<DeviceEventRecord | undefined> {
    return this.events.get(id);
  }

  async markTimedOutOffline(cutoff: number, current: number): Promise<number> {
    this.markTimedOutCall = { cutoff, now: current };
    return this.markTimedOutResult;
  }

  async deleteEventsBefore(cutoff: number): Promise<number> {
    this.deleteExpiredCutoff = cutoff;
    return this.deleteExpiredResult;
  }
}

class FakeCrypto implements DeviceCryptoPort {
  readonly encryptCalls: Array<{ plaintext: string; aad: string }> = [];
  readonly decryptValues = new Map<string, string>();
  verifyResult = true;

  async encrypt(plaintext: string, aad: string): Promise<string> {
    this.encryptCalls.push({ plaintext, aad });
    return `encrypted:${aad}`;
  }

  async decrypt(ciphertext: string): Promise<string> {
    return this.decryptValues.get(ciphertext) ?? "{}";
  }

  async hashToken(token: string): Promise<string> {
    return `hashed-${token}`;
  }

  async verifyToken(): Promise<boolean> {
    return this.verifyResult;
  }

  async generateToken(): Promise<{ token: string; tokenHash: string }> {
    return { token: "new-token", tokenHash: "new-token-hash" };
  }
}

describe("设备注册与上报应用用例", () => {
  let repository: FakeRepository;
  let crypto: FakeCrypto;
  let center: DeviceCenter;

  beforeEach(() => {
    repository = new FakeRepository();
    crypto = new FakeCrypto();
    center = new DeviceCenter({
      repository,
      crypto,
      clock: { now: () => now },
    });
  });

  it("新增设备时显式初始化全部持久化字段", async () => {
    await expect(
      center.addDevice(
        {
          clientId: "device-01",
          deviceName: "Pixel",
          isEnabled: true,
          remark: "test",
        },
        { id: 42 }
      )
    ).resolves.toBe(10);
    expect(repository.addCalls).toHaveLength(1);
    expect(repository.addCalls[0]).toMatchObject({
      clientId: "device-01",
      deviceName: "Pixel",
      isEnabled: true,
      remark: "test",
      reportedStatus: null,
      reportTokenHash: null,
      creatorId: 42,
    });
  });

  it("拒绝重复 clientId 和更新时修改 clientId", async () => {
    repository.put(createDevice());
    await expect(
      center.addDevice({ clientId: "device-01", isEnabled: true }, { id: 1 })
    ).rejects.toThrow("Device clientId already exists");
    await expect(
      center.updateDevice(
        { id: 1, clientId: "other", isEnabled: true },
        { id: 1 }
      )
    ).rejects.toThrow("Device clientId is immutable");
  });

  it("令牌校验后以服务端时间保存 Presence", async () => {
    repository.put(createDevice({ reportedStatus: "OFFLINE" }));
    await center.processDevicePresence(
      {
        protocolVersion: 2,
        deviceId: "device-01",
        status: "ONLINE",
        timestamp: 1,
      },
      "token"
    );
    expect(repository.snapshotCalls[0]).toEqual({
      clientId: "device-01",
      data: {
        reportedStatus: "ONLINE",
        lastHeartbeatTimeUtc: now,
        lastOnlineTimeUtc: now,
        lastOfflineTimeUtc: null,
        protocolVersion: 2,
      },
    });
    crypto.verifyResult = false;
    await expect(
      center.verifyDeviceReportToken("device-01", "bad-token")
    ).rejects.toThrow("Invalid or expired device report token");
  });

  it("Info 加密原始标识并只保存掩码", async () => {
    repository.put(createDevice());
    await center.processDeviceInfo({
      protocolVersion: 2,
      deviceId: "device-01",
      timestamp: now,
      manufacturer: "Google",
      brand: "google",
      model: "Pixel 5",
      androidVersion: "14",
      androidSdk: 34,
      autojs6Version: "6.6.4",
      clientVersion: "2.0.0",
      identifiers: {
        imeis: ["123456789012345"],
        imeiStatus: "available",
        serialNumber: "serial-01",
        serialStatus: "available",
      },
      capabilities: { root: false, trustedScripts: [] },
      reportedExtra: { locale: "zh-CN" },
    });
    expect(crypto.encryptCalls.map((call) => call.aad)).toEqual([
      "mobile-device:device-01:imeis",
      "mobile-device:device-01:serial",
    ]);
    expect(repository.snapshotCalls[0]?.data).toMatchObject({
      imeiMaskedJson: '["***********2345"]',
      imeiCiphertext: "encrypted:mobile-device:device-01:imeis",
      serialMasked: "*****l-01",
      serialCiphertext: "encrypted:mobile-device:device-01:serial",
    });
  });

  it("重复事件不重复更新快照，首次事件保持幂等落库", async () => {
    repository.put(createDevice());
    const input = {
      protocolVersion: 2 as const,
      eventId: "12345678-1234-1234-1234-123456789abc",
      deviceId: "device-01",
      type: "battery" as const,
      timestamp: now,
      data: { level: 50, isCharging: false },
    };
    await expect(center.processDeviceEvent(input)).resolves.toEqual({
      duplicate: false,
    });
    expect(repository.snapshotCalls[0]?.data).toEqual({
      batteryLevel: 50,
      isCharging: false,
    });
    repository.insertEventResult = false;
    repository.snapshotCalls.length = 0;
    await expect(center.processDeviceEvent(input)).resolves.toEqual({
      duplicate: true,
    });
    expect(repository.snapshotCalls).toHaveLength(0);
  });

  it("敏感事件加密正文并按原 AAD 保存", async () => {
    repository.put(createDevice());
    await center.processDeviceEvent({
      protocolVersion: 2,
      eventId: "12345678-1234-1234-1234-123456789abc",
      deviceId: "device-01",
      type: "sms",
      timestamp: now,
      data: { address: "13800138000", body: "secret" },
    });
    expect(crypto.encryptCalls[0]).toEqual({
      plaintext: '{"address":"13800138000","body":"secret"}',
      aad: "mobile-device-event:device-01:12345678-1234-1234-1234-123456789abc",
    });
    expect(repository.eventInsertCalls[0]?.payloadCiphertext).toContain(
      "mobile-device-event:device-01"
    );
  });

  it("元数据占位符保留旧敏感值", async () => {
    repository.put(
      createDevice({ customSensitiveMetadataCiphertext: "old-cipher" })
    );
    crypto.decryptValues.set(
      "old-cipher",
      '{"secret":{"value":"old","sensitive":true}}'
    );
    await center.updateDeviceMetadata(
      {
        id: 1,
        customMetadata: {
          owner: { value: "fred", sensitive: false },
          secret: { value: "••••••", sensitive: true },
        },
      },
      { id: 9 }
    );
    expect(crypto.encryptCalls[0]?.plaintext).toBe(
      '{"secret":{"value":"old","sensitive":true}}'
    );
    expect(repository.snapshotCalls[0]?.data).toMatchObject({ updaterId: 9 });
  });

  it("重置令牌、任务目标与日志标签使用最小端口", async () => {
    repository.put(createDevice());
    await expect(center.resetReportToken(1)).resolves.toEqual({
      token: "new-token",
    });
    expect(repository.snapshotCalls[0]?.data).toEqual({
      reportTokenHash: "new-token-hash",
    });
    await expect(center.findDeviceTaskTarget("device-01")).resolves.toEqual({
      isEnabled: true,
    });
    await expect(center.getDeviceLogLabel("device-01")).resolves.toBe(
      "hashed-devic"
    );
  });

  it("维护任务使用同一注入时钟", async () => {
    repository.markTimedOutResult = 2;
    repository.deleteExpiredResult = 3;
    await expect(center.markTimedOutDevicesOffline()).resolves.toBe(2);
    await expect(center.cleanupExpiredDeviceEvents()).resolves.toBe(3);
    expect(repository.markTimedOutCall).toEqual({
      cutoff: now - 150_000,
      now,
    });
    expect(repository.deleteExpiredCutoff).toBe(now - 30 * 24 * 60 * 60 * 1000);
  });

  it("领域错误在应用边界转换为 DeviceApplicationError", async () => {
    repository.put(createDevice());
    await expect(
      center.processDeviceEvent({
        protocolVersion: 2,
        eventId: "bad",
        deviceId: "device-01",
        type: "battery",
        timestamp: now,
        data: { level: 50, isCharging: false },
      })
    ).rejects.toBeInstanceOf(DeviceApplicationError);
  });

  it("元数据结构错误保持旧基础异常边界", async () => {
    repository.put(createDevice());
    await expect(
      center.updateDeviceMetadata(
        {
          id: 1,
          customMetadata: {
            tokenAlias: { value: "secret", sensitive: false },
          },
        },
        { id: 1 }
      )
    ).rejects.not.toBeInstanceOf(DeviceApplicationError);
  });
});
