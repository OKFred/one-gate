import { isIP } from "node:net";

export const NETWORK_ROUTING_STATES = [
  "DISABLED",
  "APPLYING",
  "RECOVERING",
  "ACTIVE",
  "FAILED",
  "ROLLBACK_FAILED",
  "DEGRADED",
] as const;
export type NetworkRoutingState = (typeof NETWORK_ROUTING_STATES)[number];
export type NetworkRoutingTarget = "default" | "wifi" | "carrier";
export const NETWORK_ROUTING_RUNTIME_STATES = [
  "DISABLED",
  "RECOVERING",
  "ACTIVE",
  "DEGRADED",
] as const;
export type NetworkRoutingRuntimeState =
  (typeof NETWORK_ROUTING_RUNTIME_STATES)[number];

export interface NetworkRoutingStatusEvent {
  protocolVersion: 1;
  deviceId: string;
  generation: number;
  policyRevision: number | null;
  target: NetworkRoutingTarget | null;
  state: NetworkRoutingRuntimeState;
  code: string;
  message: string;
  timestamp: number;
  verifiedAt: number | null;
  wifiInterface: string | null;
  carrierInterface: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 严格解析手机客户端 retained 网络分流状态，不接收公网 IP 等额外字段。 */
export function parseNetworkRoutingStatusEvent(
  value: unknown
): NetworkRoutingStatusEvent | null {
  if (!isRecord(value) || value.protocolVersion !== 1) return null;
  const allowedKeys = new Set([
    "protocolVersion",
    "deviceId",
    "generation",
    "policyRevision",
    "target",
    "state",
    "code",
    "message",
    "timestamp",
    "verifiedAt",
    "wifiInterface",
    "carrierInterface",
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;
  const state = value.state;
  const target = value.target;
  const policyRevision = value.policyRevision;
  const verifiedAt = value.verifiedAt;
  const interfacePattern = /^[A-Za-z0-9_.:@-]{1,32}$/;
  const nullableInterface = (input: unknown) =>
    input === null ||
    (typeof input === "string" && interfacePattern.test(input));
  if (
    typeof value.deviceId !== "string" ||
    value.deviceId.length < 1 ||
    value.deviceId.length > 100 ||
    !Number.isInteger(value.generation) ||
    Number(value.generation) < 0 ||
    !NETWORK_ROUTING_RUNTIME_STATES.includes(
      state as NetworkRoutingRuntimeState
    ) ||
    (target !== null &&
      target !== "default" &&
      target !== "wifi" &&
      target !== "carrier") ||
    (policyRevision !== null &&
      (!Number.isInteger(policyRevision) || Number(policyRevision) < 1)) ||
    typeof value.code !== "string" ||
    value.code.length < 1 ||
    value.code.length > 100 ||
    typeof value.message !== "string" ||
    value.message.length > 500 ||
    typeof value.timestamp !== "number" ||
    !Number.isFinite(value.timestamp) ||
    (verifiedAt !== null &&
      (typeof verifiedAt !== "number" || !Number.isFinite(verifiedAt))) ||
    !nullableInterface(value.wifiInterface) ||
    !nullableInterface(value.carrierInterface)
  ) {
    return null;
  }
  if (
    (state === "DISABLED" && (target !== null || policyRevision !== null)) ||
    (state !== "DISABLED" &&
      (target === null || !Number.isInteger(policyRevision)))
  ) {
    return null;
  }
  return {
    protocolVersion: 1,
    deviceId: value.deviceId,
    generation: Number(value.generation),
    policyRevision: policyRevision === null ? null : Number(policyRevision),
    target: target as NetworkRoutingTarget | null,
    state: state as NetworkRoutingRuntimeState,
    code: value.code,
    message: value.message,
    timestamp: value.timestamp,
    verifiedAt: verifiedAt === null ? null : Number(verifiedAt),
    wifiInterface:
      value.wifiInterface === null ? null : String(value.wifiInterface),
    carrierInterface:
      value.carrierInterface === null ? null : String(value.carrierInterface),
  };
}

export const DEFAULT_NETWORK_ROUTING_CONFIG = {
  lanCidrs: ["192.168.0.0/16"],
  lanProbeUrls: ["http://192.168.1.4/", "http://192.168.12.1:8080/"],
  internetProbeUrl: "http://ip.3322.net/",
  probeTimeoutMs: 10_000,
} as const;

export interface NetworkRoutingConfig {
  lanCidrs: string[];
  lanProbeUrls: string[];
  internetProbeUrl: string;
  probeTimeoutMs: number;
}

export class NetworkRoutingRuleViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkRoutingRuleViolation";
  }
}

function ipv4Number(value: string): number | null {
  if (isIP(value) !== 4) return null;
  return value
    .split(".")
    .map(Number)
    .reduce((result, octet) => (result * 256 + octet) >>> 0, 0);
}

/** 校验规范 RFC1918 CIDR 并阻止默认路由。 */
export function normalizePrivateIpv4Cidr(value: string): string {
  const match = value.trim().match(/^([^/]+)\/(\d{1,2})$/);
  if (!match) throw new NetworkRoutingRuleViolation("内网 CIDR 格式无效");
  const address = ipv4Number(match[1]);
  const prefix = Number(match[2]);
  if (address === null || prefix < 1 || prefix > 32) {
    throw new NetworkRoutingRuleViolation("内网 CIDR 格式无效");
  }
  const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (address & mask) >>> 0;
  if (network !== address) {
    throw new NetworkRoutingRuleViolation("内网 CIDR 必须使用规范网络地址");
  }
  const privateRange =
    (network >= ipv4Number("10.0.0.0")! &&
      network <= ipv4Number("10.255.255.255")!) ||
    (network >= ipv4Number("172.16.0.0")! &&
      network <= ipv4Number("172.31.255.255")!) ||
    (network >= ipv4Number("192.168.0.0")! &&
      network <= ipv4Number("192.168.255.255")!);
  if (!privateRange)
    throw new NetworkRoutingRuleViolation("内网 CIDR 仅允许 RFC1918 IPv4");
  return `${match[1]}/${prefix}`;
}

function ipv4InCidrs(addressText: string, cidrs: readonly string[]): boolean {
  const address = ipv4Number(addressText);
  if (address === null) return false;
  return cidrs.some((cidr) => {
    const [networkText, prefixText] = cidr.split("/");
    const network = ipv4Number(networkText)!;
    const prefix = Number(prefixText);
    const mask =
      prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0;
    return (address & mask) >>> 0 === network;
  });
}

/** 校验页面保存的每设备策略配置。 */
export function normalizeNetworkRoutingConfig(
  input: NetworkRoutingConfig
): NetworkRoutingConfig {
  if (
    !Array.isArray(input.lanCidrs) ||
    input.lanCidrs.length < 1 ||
    input.lanCidrs.length > 16
  ) {
    throw new NetworkRoutingRuleViolation("内网 CIDR 必须包含 1 到 16 项");
  }
  const lanCidrs = [...new Set(input.lanCidrs.map(normalizePrivateIpv4Cidr))];
  const parseUrl = (raw: string, lan: boolean): string => {
    if (typeof raw !== "string" || raw.length > 2048) {
      throw new NetworkRoutingRuleViolation("探针 URL 无效");
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new NetworkRoutingRuleViolation("探针 URL 无效");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.hash
    ) {
      throw new NetworkRoutingRuleViolation("探针 URL 包含不允许的字段");
    }
    if (
      lan &&
      (isIP(url.hostname) !== 4 || !ipv4InCidrs(url.hostname, lanCidrs))
    ) {
      throw new NetworkRoutingRuleViolation(
        "内网探针 IP 必须位于已配置 CIDR 内"
      );
    }
    return url.toString();
  };
  if (
    !Array.isArray(input.lanProbeUrls) ||
    input.lanProbeUrls.length < 1 ||
    input.lanProbeUrls.length > 16
  ) {
    throw new NetworkRoutingRuleViolation("内网探针必须包含 1 到 16 项");
  }
  if (
    !Number.isInteger(input.probeTimeoutMs) ||
    input.probeTimeoutMs < 3_000 ||
    input.probeTimeoutMs > 30_000
  ) {
    throw new NetworkRoutingRuleViolation(
      "探针超时必须介于 3000 到 30000 毫秒"
    );
  }
  return {
    lanCidrs,
    lanProbeUrls: [
      ...new Set(input.lanProbeUrls.map((url) => parseUrl(url, true))),
    ],
    internetProbeUrl: parseUrl(input.internetProbeUrl, false),
    probeTimeoutMs: input.probeTimeoutMs,
  };
}
