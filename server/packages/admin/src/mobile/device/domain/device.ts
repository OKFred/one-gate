export const DEVICE_EVENT_TYPES = [
  "battery",
  "network",
  "sms",
  "notification",
] as const;

export type DeviceEventType = (typeof DEVICE_EVENT_TYPES)[number];
export type DeviceReportedStatus = "ONLINE" | "OFFLINE";

export const DEVICE_ONLINE_THRESHOLD_MS = 150_000;
export const DEVICE_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const DEVICE_EVENT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
export const DEVICE_MAX_REPORT_JSON_BYTES = 32 * 1024;

export interface DevicePresenceInput {
  protocolVersion: 2;
  deviceId: string;
  status: DeviceReportedStatus;
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

export interface TrustedDeviceCapabilities {
  root: boolean;
  trustedScripts: Array<{ scriptId: string; version: number }>;
  deployment?: { protocolVersion: 1; supervisorVersion: string };
  ops?: {
    protocolVersion: 1;
    enabled: boolean;
    arbitraryShell: false;
    operations: string[];
  };
}

export interface DevicePresenceState {
  reportedStatus: DeviceReportedStatus | null;
  lastHeartbeatTimeUtc: number | null;
  lastOnlineTimeUtc: number | null;
  lastOfflineTimeUtc: number | null;
}

export interface DeviceEventSnapshot {
  batteryLevel?: number;
  isCharging?: boolean;
  networkConnected?: boolean;
  networkType?: string;
}

export interface DeviceEventProjection {
  summary: Record<string, unknown>;
  snapshot: DeviceEventSnapshot;
  sensitive: boolean;
}

export class DeviceRuleViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceRuleViolation";
  }
}

function fail(message: string): never {
  throw new DeviceRuleViolation(message);
}

/** 限制 MQTT/HTTP 共用载荷中的可扩展 JSON 大小。 */
export function assertReportJsonSize(value: unknown, label: string): void {
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength >
    DEVICE_MAX_REPORT_JSON_BYTES
  ) {
    fail(`${label} exceeds 32 KiB`);
  }
}

/** 校验并规范化列表可直接展示的可信脚本能力。 */
export function validateCapabilities(
  value: Record<string, unknown>
): TrustedDeviceCapabilities {
  if (typeof value.root !== "boolean" || !Array.isArray(value.trustedScripts)) {
    fail("Invalid device capabilities");
  }
  if (value.trustedScripts.length > 100) fail("Too many trusted scripts");
  const trustedScripts = value.trustedScripts.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item) ||
      !("scriptId" in item) ||
      typeof item.scriptId !== "string" ||
      !/^[A-Za-z0-9._:-]{1,100}$/.test(item.scriptId) ||
      !("version" in item) ||
      typeof item.version !== "number" ||
      !Number.isInteger(item.version) ||
      item.version < 1
    ) {
      fail("Invalid trusted script capability");
    }
    return { scriptId: item.scriptId, version: item.version };
  });
  let deployment: TrustedDeviceCapabilities["deployment"];
  if (value.deployment !== undefined) {
    if (
      typeof value.deployment !== "object" ||
      value.deployment === null ||
      Array.isArray(value.deployment) ||
      !("protocolVersion" in value.deployment) ||
      value.deployment.protocolVersion !== 1 ||
      !("supervisorVersion" in value.deployment) ||
      typeof value.deployment.supervisorVersion !== "string"
    ) {
      fail("Invalid deployment capability");
    }
    deployment = {
      protocolVersion: 1,
      supervisorVersion: value.deployment.supervisorVersion,
    };
  }
  let ops: TrustedDeviceCapabilities["ops"];
  if (value.ops !== undefined) {
    if (
      typeof value.ops !== "object" ||
      value.ops === null ||
      Array.isArray(value.ops) ||
      !("protocolVersion" in value.ops) ||
      value.ops.protocolVersion !== 1 ||
      !("enabled" in value.ops) ||
      typeof value.ops.enabled !== "boolean" ||
      !("arbitraryShell" in value.ops) ||
      value.ops.arbitraryShell !== false ||
      !("operations" in value.ops) ||
      !Array.isArray(value.ops.operations) ||
      value.ops.operations.length > 50 ||
      !value.ops.operations.every(
        (operation) =>
          typeof operation === "string" &&
          /^device\.(?:ops|audio|storage|files|foreground|network|screen)\.[a-z]+$/.test(
            operation
          ) &&
          !operation.includes("shell")
      )
    ) {
      fail("Invalid operations capability");
    }
    ops = {
      protocolVersion: 1,
      enabled: value.ops.enabled,
      arbitraryShell: false,
      operations: [...value.ops.operations] as string[],
    };
  }
  return { root: value.root, trustedScripts, deployment, ops };
}

/** 去重并校验设备标识符与可用状态的一致性。 */
export function normalizeDeviceIdentifiers(
  identifiers: DeviceInfoInput["identifiers"]
): DeviceInfoInput["identifiers"] {
  if (identifiers.imeis.length > 4) fail("Too many IMEI values");
  const imeis = [...new Set(identifiers.imeis.filter(Boolean))];
  if (imeis.some((imei) => !/^\d{14,17}$/.test(imei))) {
    fail("Invalid IMEI value");
  }
  if ((identifiers.imeiStatus === "available") !== imeis.length > 0) {
    fail("IMEI status does not match collected values");
  }
  if (
    identifiers.serialNumber !== null &&
    (identifiers.serialNumber.length === 0 ||
      identifiers.serialNumber.length > 200)
  ) {
    fail("Invalid hardware serial number");
  }
  if (
    (identifiers.serialStatus === "available") !==
    (identifiers.serialNumber !== null)
  ) {
    fail("Serial status does not match collected value");
  }
  return { ...identifiers, imeis };
}

/** 设备是否仍处于有效在线窗口。 */
export function isEffectivelyOnline(
  row: Pick<DevicePresenceState, "reportedStatus" | "lastHeartbeatTimeUtc">,
  now: number
): boolean {
  return (
    row.reportedStatus === "ONLINE" &&
    row.lastHeartbeatTimeUtc !== null &&
    row.lastHeartbeatTimeUtc >= now - DEVICE_ONLINE_THRESHOLD_MS
  );
}

/** 使用服务端接收时间生成 Presence 快照，设备时间仅用于协议审计。 */
export function projectPresence(
  row: DevicePresenceState,
  input: DevicePresenceInput,
  now: number
): DevicePresenceState & { protocolVersion: 2 } {
  return {
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
  };
}

/** 仅保留标识尾四位，其他字符统一遮罩。 */
export function maskIdentifier(value: string): string {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}

/** 解析字符串数组 JSON；历史脏值退化为空数组。 */
export function parseStringArray(value: string | null): string[] {
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

/** 验证事件信封并生成不泄露正文的摘要与快照。 */
export function projectDeviceEvent(
  input: DeviceEventInput,
  now: number
): DeviceEventProjection {
  if (!/^[0-9a-fA-F-]{36}$/.test(input.eventId)) {
    fail("Invalid device eventId");
  }
  if (
    !Number.isFinite(input.timestamp) ||
    input.timestamp < now - DEVICE_EVENT_RETENTION_MS ||
    input.timestamp > now + DEVICE_EVENT_FUTURE_TOLERANCE_MS
  ) {
    fail("Invalid device event timestamp");
  }
  assertReportJsonSize(input.data, "event data");

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
