import {
  DEVICE_EVENT_RETENTION_MS,
  DEVICE_ONLINE_THRESHOLD_MS,
  DeviceRuleViolation,
  assertReportJsonSize,
  isEffectivelyOnline,
  maskIdentifier,
  normalizeDeviceIdentifiers,
  parseStringArray,
  projectDeviceEvent,
  projectPresence,
  validateCapabilities,
  type DeviceEventInput,
  type DeviceEventType,
  type DeviceInfoInput,
  type DevicePresenceInput,
  type DeviceReportedStatus,
} from "../domain/device.js";
import {
  SENSITIVE_METADATA_PLACEHOLDER,
  isRecord,
  maskCustomMetadata,
  parseJsonRecord,
  splitCustomMetadata,
  validateCustomMetadata,
  validateReportedExtra,
  type CustomMetadata,
} from "../domain/metadata.js";
import { DeviceApplicationError } from "./error.js";
import type {
  DeviceActor,
  DeviceClockPort,
  DeviceCryptoPort,
  DeviceRecord,
  DeviceRepositoryPort,
  DeviceSortKey,
} from "./ports.js";

export type {
  DeviceEventInput,
  DeviceInfoInput,
  DevicePresenceInput,
} from "../domain/device.js";

export interface DeviceCenterDependencies {
  repository: DeviceRepositoryPort;
  crypto: DeviceCryptoPort;
  clock: DeviceClockPort;
}

export interface ListDevicesInput {
  pageNo: number;
  pageSize: number;
  keyword?: string;
  isEnabled?: boolean;
  onlineStatus?: DeviceReportedStatus;
  orderBy?: DeviceSortKey;
  descend?: boolean;
}

export interface AddDeviceInput {
  clientId: string;
  deviceName?: string | null;
  isEnabled: boolean;
  remark?: string | null;
}

export interface UpdateDeviceInput {
  id: number;
  clientId?: string;
  deviceName?: string | null;
  isEnabled?: boolean;
  remark?: string | null;
}

export interface ListDeviceEventsInput {
  deviceId: number;
  pageNo: number;
  pageSize: number;
  eventType?: DeviceEventType;
  startTimeUtc?: number;
  endTimeUtc?: number;
}

export interface UpdateDeviceMetadataInput {
  id: number;
  customMetadata: unknown;
}

export type RevealDeviceTarget = "identifiers" | "customMetadata" | "event";

function fail(message: string): never {
  throw new DeviceApplicationError(message);
}

/** 将纯领域规则异常转换为应用异常，其他基础设施异常保持原样。 */
function applyRule<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error: unknown) {
    if (error instanceof DeviceRuleViolation) {
      throw new DeviceApplicationError(error.message);
    }
    throw error;
  }
}

/** 设备注册、上报、事件和维护用例中心。 */
export class DeviceCenter {
  constructor(private readonly dependencies: DeviceCenterDependencies) {}

  async listDevices(input: ListDevicesInput) {
    const now = this.dependencies.clock.now();
    const page = await this.dependencies.repository.list({
      ...input,
      onlineCutoff: now - DEVICE_ONLINE_THRESHOLD_MS,
    });
    return {
      total: page.total,
      totalPage: page.totalPage,
      currentPage: page.currentPage,
      pageSize: page.pageSize,
      list: page.list.map((row) => this.toDeviceView(row, now)),
    };
  }

  async addDevice(input: AddDeviceInput, actor: DeviceActor): Promise<number> {
    if (await this.dependencies.repository.getByClientId(input.clientId)) {
      fail("Device clientId already exists");
    }
    return this.dependencies.repository.add({
      clientId: input.clientId,
      deviceName: input.deviceName ?? null,
      isEnabled: input.isEnabled,
      remark: input.remark ?? null,
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
      reportTokenHash: null,
      creatorId: actor.id,
    });
  }

  async updateDevice(
    input: UpdateDeviceInput,
    actor: DeviceActor
  ): Promise<boolean> {
    const existing = await this.dependencies.repository.getById(input.id);
    if (!existing) fail("Device not found");
    if (input.clientId !== existing.clientId) {
      fail("Device clientId is immutable");
    }
    await this.dependencies.repository.update({
      id: input.id,
      clientId: input.clientId,
      deviceName: input.deviceName ?? null,
      isEnabled: input.isEnabled,
      remark: input.remark ?? null,
      updaterId: actor.id,
    });
    return true;
  }

  async getDevice(id: number) {
    const row = await this.dependencies.repository.getById(id);
    if (!row) fail("Device not found");
    return this.toDeviceView(row, this.dependencies.clock.now());
  }

  async deleteDevice(id: number): Promise<boolean> {
    await this.dependencies.repository.delete(id);
    return true;
  }

  async updateDeviceMetadata(
    input: UpdateDeviceMetadataInput,
    actor: DeviceActor
  ): Promise<boolean> {
    const row = await this.dependencies.repository.getById(input.id);
    if (!row) fail("Device not found");
    const metadata = validateCustomMetadata(input.customMetadata);
    const oldSensitive = await this.readSensitiveCustomMetadata(row);
    for (const [key, entry] of Object.entries(metadata)) {
      if (
        entry.sensitive &&
        entry.value === SENSITIVE_METADATA_PLACEHOLDER &&
        oldSensitive[key]
      ) {
        metadata[key] = oldSensitive[key];
      }
    }
    const { plain, sensitive } = splitCustomMetadata(metadata);
    const sensitiveKeys = Object.keys(sensitive);
    const masked = maskCustomMetadata(plain, sensitiveKeys);
    const ciphertext =
      sensitiveKeys.length > 0
        ? await this.dependencies.crypto.encrypt(
            JSON.stringify(sensitive),
            `mobile-device:${row.clientId}:custom-metadata`
          )
        : null;
    await this.dependencies.repository.updateSnapshot(row.clientId, {
      customMetadataJson: JSON.stringify(masked),
      customSensitiveMetadataCiphertext: ciphertext,
      updaterId: actor.id,
    });
    return true;
  }

  async listDeviceEvents(input: ListDeviceEventsInput) {
    const device = await this.dependencies.repository.getById(input.deviceId);
    if (!device) fail("Device not found");
    const page = await this.dependencies.repository.listEvents({
      clientId: device.clientId,
      pageNo: input.pageNo,
      pageSize: input.pageSize,
      eventType: input.eventType,
      startTimeUtc: input.startTimeUtc,
      endTimeUtc: input.endTimeUtc,
    });
    return {
      total: page.total,
      totalPage: page.totalPage,
      currentPage: page.currentPage,
      pageSize: page.pageSize,
      list: page.list.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        clientId: row.clientId,
        eventType: row.eventType,
        eventTimeUtc: row.eventTimeUtc,
        summary: parseJsonRecord(row.summaryJson),
        hasSensitivePayload: row.payloadCiphertext !== null,
        createTimeUtc: row.createTimeUtc,
      })),
    };
  }

  async revealSensitive(id: number, target: RevealDeviceTarget) {
    if (target === "event") {
      const event = await this.dependencies.repository.getEventById(id);
      if (!event?.payloadCiphertext) fail("Sensitive event not found");
      const plaintext = await this.dependencies.crypto.decrypt(
        event.payloadCiphertext,
        `mobile-device-event:${event.clientId}:${event.eventId}`
      );
      const payload: unknown = JSON.parse(plaintext);
      return isRecord(payload) ? payload : {};
    }
    const row = await this.dependencies.repository.getById(id);
    if (!row) fail("Device not found");
    if (target === "customMetadata") {
      return this.readSensitiveCustomMetadata(row);
    }
    const imeis: unknown = row.imeiCiphertext
      ? JSON.parse(
          await this.dependencies.crypto.decrypt(
            row.imeiCiphertext,
            `mobile-device:${row.clientId}:imeis`
          )
        )
      : [];
    const serialNumber = row.serialCiphertext
      ? await this.dependencies.crypto.decrypt(
          row.serialCiphertext,
          `mobile-device:${row.clientId}:serial`
        )
      : null;
    return { imeis, serialNumber };
  }

  async resetReportToken(id: number): Promise<{ token: string }> {
    const row = await this.dependencies.repository.getById(id);
    if (!row?.isEnabled) fail("Unknown or disabled device");
    const generated = await this.dependencies.crypto.generateToken();
    await this.dependencies.repository.updateSnapshot(row.clientId, {
      reportTokenHash: generated.tokenHash,
    });
    return { token: generated.token };
  }

  async verifyDeviceReportToken(
    clientId: string,
    token: string
  ): Promise<void> {
    await this.requireTrustedDevice(clientId, token);
  }

  async processDevicePresence(
    input: DevicePresenceInput,
    token?: string
  ): Promise<void> {
    const row = await this.requireTrustedDevice(input.deviceId, token);
    const snapshot = applyRule(() =>
      projectPresence(row, input, this.dependencies.clock.now())
    );
    await this.dependencies.repository.updateSnapshot(input.deviceId, snapshot);
  }

  async processDeviceInfo(
    input: DeviceInfoInput,
    token?: string
  ): Promise<void> {
    await this.requireTrustedDevice(input.deviceId, token);
    const identifiers = applyRule(() =>
      normalizeDeviceIdentifiers(input.identifiers)
    );
    const capabilities = applyRule(() =>
      validateCapabilities(input.capabilities)
    );
    applyRule(() => assertReportJsonSize(capabilities, "capabilities"));
    const reportedExtra = validateReportedExtra(input.reportedExtra);
    const imeiCiphertext =
      identifiers.imeis.length > 0
        ? await this.dependencies.crypto.encrypt(
            JSON.stringify(identifiers.imeis),
            `mobile-device:${input.deviceId}:imeis`
          )
        : null;
    const serialCiphertext = identifiers.serialNumber
      ? await this.dependencies.crypto.encrypt(
          identifiers.serialNumber,
          `mobile-device:${input.deviceId}:serial`
        )
      : null;
    await this.dependencies.repository.updateSnapshot(input.deviceId, {
      manufacturer: input.manufacturer,
      brand: input.brand,
      model: input.model,
      androidVersion: input.androidVersion,
      androidSdk: input.androidSdk,
      autojs6Version: input.autojs6Version,
      clientVersion: input.clientVersion,
      protocolVersion: input.protocolVersion,
      imeiStatus: identifiers.imeiStatus,
      imeiMaskedJson: JSON.stringify(identifiers.imeis.map(maskIdentifier)),
      imeiCiphertext,
      serialStatus: identifiers.serialStatus,
      serialMasked: identifiers.serialNumber
        ? maskIdentifier(identifiers.serialNumber)
        : null,
      serialCiphertext,
      capabilitiesJson: JSON.stringify(capabilities),
      reportedExtraJson: JSON.stringify(reportedExtra),
    });
  }

  async processDeviceEvent(
    input: DeviceEventInput,
    token?: string
  ): Promise<{ duplicate: boolean }> {
    await this.requireTrustedDevice(input.deviceId, token);
    const projection = applyRule(() =>
      projectDeviceEvent(input, this.dependencies.clock.now())
    );
    const payloadCiphertext = projection.sensitive
      ? await this.dependencies.crypto.encrypt(
          JSON.stringify(input.data),
          `mobile-device-event:${input.deviceId}:${input.eventId}`
        )
      : null;
    const inserted = await this.dependencies.repository.insertEvent({
      eventId: input.eventId,
      clientId: input.deviceId,
      eventType: input.type,
      eventTimeUtc: input.timestamp,
      summaryJson: JSON.stringify(projection.summary),
      payloadCiphertext,
    });
    if (inserted && Object.keys(projection.snapshot).length > 0) {
      await this.dependencies.repository.updateSnapshot(
        input.deviceId,
        projection.snapshot
      );
    }
    return { duplicate: !inserted };
  }

  async markTimedOutDevicesOffline(): Promise<number> {
    const now = this.dependencies.clock.now();
    return this.dependencies.repository.markTimedOutOffline(
      now - DEVICE_ONLINE_THRESHOLD_MS,
      now
    );
  }

  async cleanupExpiredDeviceEvents(): Promise<number> {
    return this.dependencies.repository.deleteEventsBefore(
      this.dependencies.clock.now() - DEVICE_EVENT_RETENTION_MS
    );
  }

  async findDeviceTaskTarget(
    clientId: string
  ): Promise<{ isEnabled: boolean } | undefined> {
    const row = await this.dependencies.repository.getByClientId(clientId);
    return row ? { isEnabled: row.isEnabled } : undefined;
  }

  async getDeviceLogLabel(deviceId: string): Promise<string> {
    return (await this.dependencies.crypto.hashToken(deviceId)).slice(0, 12);
  }

  private async requireTrustedDevice(
    clientId: string,
    token?: string
  ): Promise<DeviceRecord> {
    const row = await this.dependencies.repository.getByClientId(clientId);
    if (!row?.isEnabled) fail("Unknown or disabled device");
    if (
      token !== undefined &&
      (!row.reportTokenHash ||
        !(await this.dependencies.crypto.verifyToken(
          token,
          row.reportTokenHash
        )))
    ) {
      fail("Invalid or expired device report token");
    }
    return row;
  }

  private async readSensitiveCustomMetadata(
    row: DeviceRecord
  ): Promise<CustomMetadata> {
    if (!row.customSensitiveMetadataCiphertext) return {};
    const plaintext = await this.dependencies.crypto.decrypt(
      row.customSensitiveMetadataCiphertext,
      `mobile-device:${row.clientId}:custom-metadata`
    );
    return validateCustomMetadata(JSON.parse(plaintext) as unknown);
  }

  private toDeviceView(row: DeviceRecord, now: number) {
    return {
      id: row.id,
      clientId: row.clientId,
      deviceName: row.deviceName,
      isEnabled: row.isEnabled,
      remark: row.remark,
      reportedStatus: row.reportedStatus,
      isOnline: isEffectivelyOnline(row, now),
      lastHeartbeatTimeUtc: row.lastHeartbeatTimeUtc,
      lastOnlineTimeUtc: row.lastOnlineTimeUtc,
      lastOfflineTimeUtc: row.lastOfflineTimeUtc,
      manufacturer: row.manufacturer,
      brand: row.brand,
      model: row.model,
      androidVersion: row.androidVersion,
      androidSdk: row.androidSdk,
      autojs6Version: row.autojs6Version,
      clientVersion: row.clientVersion,
      protocolVersion: row.protocolVersion,
      batteryLevel: row.batteryLevel,
      isCharging: row.isCharging,
      networkConnected: row.networkConnected,
      networkType: row.networkType,
      imeiStatus: row.imeiStatus,
      imeiMasked: parseStringArray(row.imeiMaskedJson),
      serialStatus: row.serialStatus,
      serialMasked: row.serialMasked,
      capabilities: parseJsonRecord(row.capabilitiesJson),
      reportedExtra: parseJsonRecord(row.reportedExtraJson),
      customMetadata: parseJsonRecord(row.customMetadataJson),
      creatorId: row.creatorId,
      updaterId: row.updaterId,
      createTimeUtc: row.createTimeUtc,
      updateTimeUtc: row.updateTimeUtc,
    };
  }
}
