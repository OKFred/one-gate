import { isIP } from "node:net";

export const NETWORK_ROUTING_STATES = [
  "DISABLED",
  "APPLYING",
  "ACTIVE",
  "FAILED",
  "ROLLBACK_FAILED",
  "DEGRADED",
] as const;
export type NetworkRoutingState = (typeof NETWORK_ROUTING_STATES)[number];
export type NetworkRoutingTarget = "wifi" | "carrier";

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
