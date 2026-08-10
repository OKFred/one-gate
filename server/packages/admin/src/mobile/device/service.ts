import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import {
  bodyAdapter,
  bodyUserAdapter,
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { Context, UserObj } from "@hodor/core/types/app";

import {
  decryptSensitiveText,
  encryptSensitiveText,
  generateDeviceToken,
  maskIdentifier,
  verifyDeviceToken,
} from "./crypto";
import {
  CustomMetadataValueVO,
  DEVICE_EVENT_TYPES,
  DeviceEventReportVO,
  DeviceEventVO,
  DeviceInfoReportVO,
  DevicePresenceReportVO,
  IndexVO,
  MobileDeviceAddKeys,
  MobileDeviceAddVO,
  MobileDeviceDetailKeys,
  MobileDeviceListKeys,
  MobileDeviceSortableKeys,
  MobileDeviceUpdateKeys,
  MobileDeviceUpdateVO,
  MobileDeviceVO,
  type DeviceEventType,
  type MobileDevicePOLike,
} from "./model";
import {
  isRecord,
  maskCustomMetadata,
  parseJsonRecord,
  splitCustomMetadata,
  validateCustomMetadata,
  validateReportedExtra,
  type CustomMetadata,
} from "./metadata";
import { mobileDeviceRepo } from "./repository";

const ONLINE_THRESHOLD_MS = 150_000;
const EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const EVENT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_REPORT_JSON_BYTES = 32 * 1024;
const SENSITIVE_PLACEHOLDER = "••••••";

export interface DevicePresenceInput {
  protocolVersion: 2;
  deviceId: string;
  status: "ONLINE" | "OFFLINE";
  timestamp: number;
}

export interface DeviceInfoInput {
  protocolVersion: 2;
  deviceId: string;
  timestamp: number;
  manufacturer: string;
  brand: string;
  model: string;
  androidVersion: string;
  androidSdk: number | null;
  autojs6Version: string;
  clientVersion: string;
  identifiers: {
    imeis: string[];
    imeiStatus: "available" | "unavailable";
    serialNumber: string | null;
    serialStatus: "available" | "unavailable";
  };
  capabilities: Record<string, unknown>;
  reportedExtra: Record<string, unknown>;
}

export interface DeviceEventInput {
  protocolVersion: 2;
  eventId: string;
  deviceId: string;
  type: DeviceEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/** 抛出带统一错误码的安全业务错误。 */
function fail(message: string): never {
  throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, { message });
}

/** 限制 MQTT/HTTP 共用载荷中的可扩展 JSON 大小。 */
function assertReportJsonSize(value: unknown, label: string): void {
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength >
    MAX_REPORT_JSON_BYTES
  ) {
    fail(`${label} exceeds 32 KiB`);
  }
}

/** 校验并规范化列表可直接展示的可信脚本能力，拒绝任意敏感扩展。 */
function validateCapabilities(value: Record<string, unknown>): {
  root: boolean;
  trustedScripts: Array<{ scriptId: string; version: number }>;
} {
  if (typeof value.root !== "boolean" || !Array.isArray(value.trustedScripts)) {
    fail("Invalid device capabilities");
  }
  if (value.trustedScripts.length > 100) fail("Too many trusted scripts");
  const trustedScripts = value.trustedScripts.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.scriptId !== "string" ||
      !/^[A-Za-z0-9._:-]{1,100}$/.test(item.scriptId) ||
      typeof item.version !== "number" ||
      !Number.isInteger(item.version) ||
      item.version < 1
    ) {
      fail("Invalid trusted script capability");
    }
    return { scriptId: item.scriptId, version: item.version };
  });
  return { root: value.root, trustedScripts };
}

/** 解析字符串数组 JSON。 */
function parseStringArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/** 设备是否仍处于有效在线窗口。 */
function isEffectivelyOnline(
  row: MobileDevicePOLike,
  now = Date.now()
): boolean {
  return (
    row.reportedStatus === "ONLINE" &&
    row.lastHeartbeatTimeUtc !== null &&
    row.lastHeartbeatTimeUtc >= now - ONLINE_THRESHOLD_MS
  );
}

/** 将数据库行转换成不含密文、令牌摘要的管理端视图。 */
function toDeviceView(row: MobileDevicePOLike) {
  return {
    id: row.id,
    clientId: row.clientId,
    deviceName: row.deviceName,
    isEnabled: row.isEnabled,
    remark: row.remark,
    reportedStatus: row.reportedStatus,
    isOnline: isEffectivelyOnline(row),
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

/** 校验设备存在且启用；HTTP 额外验证一次性生成的设备令牌。 */
async function requireTrustedDevice(
  clientId: string,
  token?: string
): Promise<MobileDevicePOLike> {
  const row = await mobileDeviceRepo.getByClientId(clientId);
  if (!row || !row.isEnabled) fail("Unknown or disabled device");
  if (token !== undefined) {
    if (
      !row.reportTokenHash ||
      !(await verifyDeviceToken(token, row.reportTokenHash))
    ) {
      fail("Invalid or expired device report token");
    }
  }
  return row;
}

/** 处理 MQTT/HTTP 共用的 Presence。 */
export async function processDevicePresence(
  input: DevicePresenceInput,
  token?: string
): Promise<void> {
  const row = await requireTrustedDevice(input.deviceId, token);
  const now = Date.now();
  await mobileDeviceRepo.updateSnapshot(input.deviceId, {
    reportedStatus: input.status,
    lastHeartbeatTimeUtc:
      input.status === "ONLINE" ? now : row.lastHeartbeatTimeUtc,
    lastOnlineTimeUtc:
      input.status === "ONLINE" && row.reportedStatus !== "ONLINE"
        ? now
        : row.lastOnlineTimeUtc,
    lastOfflineTimeUtc:
      input.status === "OFFLINE" ? now : row.lastOfflineTimeUtc,
    protocolVersion: input.protocolVersion,
  });
}

/** 处理并加密进程启动时采集的静态设备信息。 */
export async function processDeviceInfo(
  input: DeviceInfoInput,
  token?: string
): Promise<void> {
  await requireTrustedDevice(input.deviceId, token);
  if (input.identifiers.imeis.length > 4) fail("Too many IMEI values");
  const imeis = [...new Set(input.identifiers.imeis.filter(Boolean))];
  if (imeis.some((imei) => !/^\d{14,17}$/.test(imei))) {
    fail("Invalid IMEI value");
  }
  if ((input.identifiers.imeiStatus === "available") !== imeis.length > 0) {
    fail("IMEI status does not match collected values");
  }
  if (
    input.identifiers.serialNumber !== null &&
    (input.identifiers.serialNumber.length === 0 ||
      input.identifiers.serialNumber.length > 200)
  ) {
    fail("Invalid hardware serial number");
  }
  if (
    (input.identifiers.serialStatus === "available") !==
    (input.identifiers.serialNumber !== null)
  ) {
    fail("Serial status does not match collected value");
  }
  const capabilities = validateCapabilities(input.capabilities);
  assertReportJsonSize(capabilities, "capabilities");
  const reportedExtra = validateReportedExtra(input.reportedExtra);
  const imeiCiphertext =
    imeis.length > 0
      ? await encryptSensitiveText(
          JSON.stringify(imeis),
          `mobile-device:${input.deviceId}:imeis`
        )
      : null;
  const serialCiphertext = input.identifiers.serialNumber
    ? await encryptSensitiveText(
        input.identifiers.serialNumber,
        `mobile-device:${input.deviceId}:serial`
      )
    : null;
  await mobileDeviceRepo.updateSnapshot(input.deviceId, {
    manufacturer: input.manufacturer,
    brand: input.brand,
    model: input.model,
    androidVersion: input.androidVersion,
    androidSdk: input.androidSdk,
    autojs6Version: input.autojs6Version,
    clientVersion: input.clientVersion,
    protocolVersion: input.protocolVersion,
    imeiStatus: input.identifiers.imeiStatus,
    imeiMaskedJson: JSON.stringify(imeis.map(maskIdentifier)),
    imeiCiphertext,
    serialStatus: input.identifiers.serialStatus,
    serialMasked: input.identifiers.serialNumber
      ? maskIdentifier(input.identifiers.serialNumber)
      : null,
    serialCiphertext,
    capabilitiesJson: JSON.stringify(capabilities),
    reportedExtraJson: JSON.stringify(reportedExtra),
  });
}

/** 构造不会泄露正文的事件摘要及状态快照更新。 */
function summarizeEvent(input: DeviceEventInput): {
  summary: Record<string, unknown>;
  snapshot: Partial<MobileDevicePOLike>;
  sensitive: boolean;
} {
  if (input.type === "battery") {
    const level = input.data.level;
    const isCharging = input.data.isCharging;
    if (typeof level !== "number" || !Number.isFinite(level)) {
      fail("Invalid battery level");
    }
    if (typeof isCharging !== "boolean") fail("Invalid charging status");
    const normalizedLevel = Math.max(0, Math.min(100, Math.round(level)));
    return {
      summary: { level: normalizedLevel, isCharging },
      snapshot: { batteryLevel: normalizedLevel, isCharging },
      sensitive: false,
    };
  }
  if (input.type === "network") {
    const isConnected = input.data.isConnected;
    const type = input.data.type;
    if (typeof isConnected !== "boolean" || typeof type !== "string") {
      fail("Invalid network event");
    }
    return {
      summary: { isConnected, type: type.slice(0, 100) },
      snapshot: {
        networkConnected: isConnected,
        networkType: type.slice(0, 100),
      },
      sensitive: false,
    };
  }
  if (input.type === "sms") {
    const address =
      typeof input.data.address === "string" ? input.data.address : "";
    const body = typeof input.data.body === "string" ? input.data.body : "";
    return {
      summary: {
        addressMasked: address ? maskIdentifier(address) : "unavailable",
        bodyLength: body.length,
      },
      snapshot: {},
      sensitive: true,
    };
  }
  const packageName =
    typeof input.data.packageName === "string" ? input.data.packageName : "";
  const title = typeof input.data.title === "string" ? input.data.title : "";
  const text = typeof input.data.text === "string" ? input.data.text : "";
  return {
    summary: {
      packageName: packageName.slice(0, 200),
      titleLength: title.length,
      textLength: text.length,
    },
    snapshot: {},
    sensitive: true,
  };
}

/** 处理并幂等保存设备变化/产生事件。 */
export async function processDeviceEvent(
  input: DeviceEventInput,
  token?: string
): Promise<{ duplicate: boolean }> {
  await requireTrustedDevice(input.deviceId, token);
  const now = Date.now();
  if (!/^[0-9a-fA-F-]{36}$/.test(input.eventId)) {
    fail("Invalid device eventId");
  }
  if (
    !Number.isFinite(input.timestamp) ||
    input.timestamp < now - EVENT_RETENTION_MS ||
    input.timestamp > now + EVENT_FUTURE_TOLERANCE_MS
  ) {
    fail("Invalid device event timestamp");
  }
  assertReportJsonSize(input.data, "event data");
  const { summary, snapshot, sensitive } = summarizeEvent(input);
  const payloadCiphertext = sensitive
    ? await encryptSensitiveText(
        JSON.stringify(input.data),
        `mobile-device-event:${input.deviceId}:${input.eventId}`
      )
    : null;
  const inserted = await mobileDeviceRepo.insertEvent({
    eventId: input.eventId,
    clientId: input.deviceId,
    eventType: input.type,
    eventTimeUtc: input.timestamp,
    summaryJson: JSON.stringify(summary),
    payloadCiphertext,
  });
  if (inserted && Object.keys(snapshot).length > 0) {
    await mobileDeviceRepo.updateSnapshot(input.deviceId, snapshot);
  }
  return { duplicate: !inserted };
}

/** Worker/Node 定时校正超时离线设备。 */
export async function markTimedOutDevicesOffline(): Promise<number> {
  const now = Date.now();
  return mobileDeviceRepo.markTimedOutOffline(now - ONLINE_THRESHOLD_MS, now);
}

/** Worker/Node 每日清理 30 天前设备事件。 */
export async function cleanupExpiredDeviceEvents(): Promise<number> {
  return mobileDeviceRepo.deleteEventsBefore(Date.now() - EVENT_RETENTION_MS);
}

// 列表
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MobileDeviceVO.isEnabled,
    onlineStatus: {
      type: ["string", "null"],
      enum: ["ONLINE", "OFFLINE", null],
      nullable: true,
    },
    orderBy: orderByWrapper<(typeof MobileDeviceSortableKeys)[number][]>([
      ...MobileDeviceSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper(MobileDeviceVO, [...MobileDeviceListKeys]),
} as const satisfies JSONSchema;

async function onList(params: FromSchema<typeof listReq>) {
  const res = await mobileDeviceRepo.list({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    onlineStatus: params.onlineStatus ?? undefined,
    orderBy: params.orderBy,
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
    onlineCutoff: Date.now() - ONLINE_THRESHOLD_MS,
  });
  return {
    total: res.total,
    totalPage: res.totalPage,
    currentPage: res.currentPage,
    pageSize: res.pageSize,
    list: res.list.map(toDeviceView),
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取移动设备" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增/更新/详情/删除
const addReq = {
  type: "object",
  properties: { ...MobileDeviceAddVO },
  required: [...MobileDeviceAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;
const idRes = { ...IndexVO.id } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<number> {
  if (await mobileDeviceRepo.getByClientId(obj.clientId)) {
    fail("Device clientId already exists");
  }
  return mobileDeviceRepo.add({
    clientId: obj.clientId,
    deviceName: obj.deviceName ?? null,
    isEnabled: obj.isEnabled,
    remark: obj.remark ?? null,
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
    creatorId: userObj.id,
  });
}

const addApi = {
  req: addReq,
  res: idRes,
  pathInfo: { path: "/add", method: "post", summary: "添加移动设备" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: { ...MobileDeviceUpdateVO },
  required: [...MobileDeviceUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<boolean> {
  const existing = await mobileDeviceRepo.getById(params.id);
  if (!existing) fail("Device not found");
  if (params.clientId !== existing.clientId) {
    fail("Device clientId is immutable");
  }
  await mobileDeviceRepo.update({
    id: params.id,
    clientId: params.clientId,
    deviceName: params.deviceName ?? null,
    isEnabled: params.isEnabled,
    remark: params.remark ?? null,
    updaterId: userObj.id,
  });
  return true;
}
const updateApi = {
  req: updateReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/update", method: "post", summary: "更新移动设备" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(params: FromSchema<typeof getReq>) {
  const row = await mobileDeviceRepo.getById(params.id);
  if (!row) fail("Device not found");
  return toDeviceView(row);
}
const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...MobileDeviceVO },
    required: [...MobileDeviceDetailKeys],
    additionalProperties: false,
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取设备详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function onDelete(params: FromSchema<typeof getReq>): Promise<boolean> {
  await mobileDeviceRepo.delete(params.id);
  return true;
}
const deleteApi = {
  req: getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/delete", method: "post", summary: "删除移动设备" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 管理员扩展元数据
const updateMetadataReq = {
  type: "object",
  properties: {
    id: IndexVO.id,
    customMetadata: {
      type: "object",
      additionalProperties: CustomMetadataValueVO,
    },
  },
  required: ["id", "customMetadata"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 解密旧敏感自定义值，为占位符更新保留原值。 */
async function readSensitiveCustomMetadata(
  row: MobileDevicePOLike
): Promise<CustomMetadata> {
  if (!row.customSensitiveMetadataCiphertext) return {};
  const plaintext = await decryptSensitiveText(
    row.customSensitiveMetadataCiphertext,
    `mobile-device:${row.clientId}:custom-metadata`
  );
  return validateCustomMetadata(JSON.parse(plaintext) as unknown);
}

async function onUpdateMetadata(
  params: FromSchema<typeof updateMetadataReq>,
  userObj: UserObj
): Promise<boolean> {
  const row = await mobileDeviceRepo.getById(params.id);
  if (!row) fail("Device not found");
  const metadata = validateCustomMetadata(params.customMetadata);
  const oldSensitive = await readSensitiveCustomMetadata(row);
  for (const [key, entry] of Object.entries(metadata)) {
    if (
      entry.sensitive &&
      entry.value === SENSITIVE_PLACEHOLDER &&
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
      ? await encryptSensitiveText(
          JSON.stringify(sensitive),
          `mobile-device:${row.clientId}:custom-metadata`
        )
      : null;
  await mobileDeviceRepo.updateSnapshot(row.clientId, {
    customMetadataJson: JSON.stringify(masked),
    customSensitiveMetadataCiphertext: ciphertext,
    updaterId: userObj.id,
  });
  return true;
}
const updateMetadataApi = {
  req: updateMetadataReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/metadata/update",
    method: "post",
    summary: "更新设备自定义元数据",
  },
  adapter: bodyUserAdapter,
  service: onUpdateMetadata,
  permission: { action: "edit" },
} satisfies API;

// 事件列表与敏感 reveal
const eventListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    deviceId: IndexVO.id,
    eventType: {
      type: ["string", "null"],
      enum: [...DEVICE_EVENT_TYPES, null],
      nullable: true,
    },
    startTimeUtc: { type: ["number", "null"], nullable: true },
    endTimeUtc: { type: ["number", "null"], nullable: true },
  },
  required: ["deviceId", "pageNo", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const eventListRes = listResponseWrapper(DeviceEventVO, [
  "id",
  "eventId",
  "clientId",
  "eventType",
  "eventTimeUtc",
  "summary",
  "hasSensitivePayload",
  "createTimeUtc",
]);
async function onEventList(params: FromSchema<typeof eventListReq>) {
  const device = await mobileDeviceRepo.getById(params.deviceId);
  if (!device) fail("Device not found");
  const result = await mobileDeviceRepo.listEvents({
    clientId: device.clientId,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
    eventType: params.eventType ?? undefined,
    startTimeUtc: params.startTimeUtc ?? undefined,
    endTimeUtc: params.endTimeUtc ?? undefined,
  });
  return {
    total: result.total,
    totalPage: result.totalPage,
    currentPage: result.currentPage,
    pageSize: result.pageSize,
    list: result.list.map((row) => ({
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
const eventListApi = {
  req: eventListReq,
  res: eventListRes,
  pathInfo: { path: "/event/list", method: "post", summary: "查询设备事件" },
  adapter: bodyAdapter,
  service: onEventList,
  permission: { action: "read" },
} satisfies API;

const revealReq = {
  type: "object",
  properties: {
    id: IndexVO.id,
    target: {
      type: "string",
      enum: ["identifiers", "customMetadata", "event"],
    },
  },
  required: ["id", "target"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const revealRes = {
  type: "object",
  additionalProperties: true,
} as const satisfies JSONSchema;
async function onReveal(params: FromSchema<typeof revealReq>) {
  if (params.target === "event") {
    const event = await mobileDeviceRepo.getEventById(params.id);
    if (!event || !event.payloadCiphertext) fail("Sensitive event not found");
    const plaintext = await decryptSensitiveText(
      event.payloadCiphertext,
      `mobile-device-event:${event.clientId}:${event.eventId}`
    );
    const payload: unknown = JSON.parse(plaintext);
    return isRecord(payload) ? payload : {};
  }
  const row = await mobileDeviceRepo.getById(params.id);
  if (!row) fail("Device not found");
  if (params.target === "customMetadata") {
    return readSensitiveCustomMetadata(row);
  }
  const imeis = row.imeiCiphertext
    ? JSON.parse(
        await decryptSensitiveText(
          row.imeiCiphertext,
          `mobile-device:${row.clientId}:imeis`
        )
      )
    : [];
  const serialNumber = row.serialCiphertext
    ? await decryptSensitiveText(
        row.serialCiphertext,
        `mobile-device:${row.clientId}:serial`
      )
    : null;
  return { imeis, serialNumber };
}
const revealApi = {
  req: revealReq,
  res: revealRes,
  pathInfo: {
    path: "/sensitive/reveal",
    method: "post",
    summary: "查看设备敏感信息",
  },
  adapter: bodyAdapter,
  service: onReveal,
  permission: { action: "view" },
} satisfies API;

const resetTokenApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { token: { type: "string" } },
    required: ["token"],
    additionalProperties: false,
  } as const,
  pathInfo: {
    path: "/report-token/reset",
    method: "post",
    summary: "生成或重置设备上报令牌",
  },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof getReq>) => {
    const row = await mobileDeviceRepo.getById(params.id);
    if (!row || !row.isEnabled) fail("Unknown or disabled device");
    const generated = await generateDeviceToken();
    await mobileDeviceRepo.updateSnapshot(row.clientId, {
      reportTokenHash: generated.tokenHash,
    });
    return { token: generated.token };
  },
  permission: { action: "edit" },
} satisfies API;

// Worker HTTPS 上报接口
const presenceReportReq = {
  type: "object",
  properties: DevicePresenceReportVO,
  required: ["protocolVersion", "deviceId", "status", "timestamp"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const infoReportReq = {
  type: "object",
  properties: DeviceInfoReportVO,
  required: Object.keys(DeviceInfoReportVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const eventReportReq = {
  type: "object",
  properties: DeviceEventReportVO,
  required: Object.keys(DeviceEventReportVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const acceptedRes = {
  type: "object",
  properties: {
    accepted: { type: "boolean" },
    duplicate: { type: "boolean" },
  },
  required: ["accepted", "duplicate"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 从 HTTP Context 读取设备令牌，禁止 query/body 传递。 */
function reportTokenFromContext(context: Context): string {
  const token = context.req.header("x-device-token");
  if (!token) fail("Missing device report token");
  return token;
}

const reportPresenceApi = {
  req: presenceReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/presence",
    method: "post",
    summary: "设备 Presence 上报",
  },
  adapter: rawAdapter,
  service: async (context: Context) => {
    const input = context.get("bodyObj") as DevicePresenceInput;
    await processDevicePresence(input, reportTokenFromContext(context));
    return { accepted: true, duplicate: false };
  },
  permission: false,
} satisfies API;

const reportInfoApi = {
  req: infoReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/info",
    method: "post",
    summary: "设备静态信息上报",
  },
  adapter: rawAdapter,
  service: async (context: Context) => {
    const input = context.get("bodyObj") as DeviceInfoInput;
    await processDeviceInfo(input, reportTokenFromContext(context));
    return { accepted: true, duplicate: false };
  },
  permission: false,
} satisfies API;

const reportEventApi = {
  req: eventReportReq,
  res: acceptedRes,
  pathInfo: {
    path: "/report/event",
    method: "post",
    summary: "设备事件上报",
  },
  adapter: rawAdapter,
  service: async (context: Context) => {
    const input = context.get("bodyObj") as DeviceEventInput;
    const result = await processDeviceEvent(
      input,
      reportTokenFromContext(context)
    );
    return { accepted: true, duplicate: result.duplicate };
  },
  permission: false,
} satisfies API;

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  get: getApi,
  delete: deleteApi,
  updateMetadata: updateMetadataApi,
  eventList: eventListApi,
  reveal: revealApi,
  resetToken: resetTokenApi,
  reportPresence: reportPresenceApi,
  reportInfo: reportInfoApi,
  reportEvent: reportEventApi,
};
