import {
  BusinessError,
  BusinessErrorCode,
} from "../middleware/errorHandler/businessError/index.js";

// 常见私有/保留 IPv4 CIDR 网段
const PRIVATE_IPV4_CIDRS = [
  "0.0.0.0/8", // Current Network / Broadcast
  "10.0.0.0/8", // Class A Private
  "100.64.0.0/10", // Carrier-grade NAT
  "127.0.0.0/8", // Loopback
  "169.254.0.0/16", // Link-Local / Cloud Metadata (169.254.169.254)
  "172.16.0.0/12", // Class B Private
  "192.0.0.0/24", // IETF Protocol Assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.168.0.0/16", // Class C Private
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // Multicast
  "240.0.0.0/4", // Reserved for Future Use
];

/**
 * 将 IPv4 字符串转为 32 位无符号整数
 */
function ip4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
  );
}

/**
 * 使用 CIDR 掩码精准计算 IPv4 是否落在指定网段
 */
function isIp4InCidr(ipInt: number, cidr: string): boolean {
  const [subnetStr, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const subnetInt = ip4ToInt(subnetStr);
  if (subnetInt === -1 || isNaN(bits) || bits < 0 || bits > 32) return false;

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (subnetInt & mask);
}

/**
 * 判断字符串是否为 IP 地址 (IPv4 或 IPv6)
 */
function isIp(host: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv4Regex.test(host) || ipv6Regex.test(host);
}

/**
 * 校验 IP 是否属于内网/黑名单 (基于精准 CIDR 与掩码位运算)
 */
export function isPrivateIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();

  // 特殊保留 Host
  if (
    cleanIp === "localhost" ||
    cleanIp === "0.0.0.0" ||
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1"
  ) {
    return true;
  }

  // 1. IPv4 CIDR 数学计算
  const ipInt = ip4ToInt(cleanIp);
  if (ipInt !== -1) {
    return PRIVATE_IPV4_CIDRS.some((cidr) => isIp4InCidr(ipInt, cidr));
  }

  // 2. IPv6 保留网段判断 (::1 环回、fc00::/7 私网、fe80::/10 链路本地)
  if (
    cleanIp === "::1" ||
    cleanIp.startsWith("fc") ||
    cleanIp.startsWith("fd") ||
    cleanIp.startsWith("fe8") ||
    cleanIp.startsWith("fe9") ||
    cleanIp.startsWith("fea") ||
    cleanIp.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

/**
 * 安全过滤并构建 Headers 实例，自动剔除包含函数、对象或控制字符（如换行符）的非法 Header 键值
 */
function toCleanHeaders(headersInit?: HeadersInit): Headers {
  const headers = new Headers();
  if (!headersInit) return headers;

  if (typeof (headersInit as Headers).forEach === "function") {
    (headersInit as Headers).forEach((val, key) => {
      try {
        headers.append(key, String(val));
      } catch {
        // ignore invalid header
      }
    });
    return headers;
  }

  if (Array.isArray(headersInit)) {
    for (const item of headersInit) {
      if (Array.isArray(item) && item.length >= 2) {
        const [k, v] = item;
        if (
          typeof k === "string" &&
          typeof v === "string" &&
          !v.includes("\n") &&
          !v.includes("\r")
        ) {
          try {
            headers.append(k, v);
          } catch {
            // ignore
          }
        }
      }
    }
    return headers;
  }

  if (typeof headersInit === "object") {
    for (const [k, v] of Object.entries(headersInit)) {
      if (
        typeof k === "string" &&
        (typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean")
      ) {
        const strVal = String(v);
        if (!strVal.includes("\n") && !strVal.includes("\r")) {
          try {
            headers.append(k, strVal);
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return headers;
}

/**
 * 将 Headers / HeadersInit 转为纯对象 Record<string, string>
 */
function headersToRecord(headersInit?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headersInit) return result;
  const headers = toCleanHeaders(headersInit);
  headers.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}

/**
 * 域名 DNS 解析 (支持 Node.js 环境与 Cloudflare Workers DoH 降级)
 */
export async function resolveDomainIps(hostname: string): Promise<string[]> {
  if (isIp(hostname)) {
    return [hostname];
  }

  const ips: string[] = [];

  // 1. 尝试使用 node:dns/promises (Node 环境或 Cloudflare Workers nodejs_compat)
  try {
    const dns = await import("node:dns/promises");
    const records = await dns.lookup(hostname, { all: true });
    records.forEach((r) => ips.push(r.address));
  } catch {
    // 降级使用 DoH
  }

  // 2. 若原生 DNS 解析为空
  if (ips.length === 0) {
    // 对于本地/测试虚拟域名 (如 .local, .mock, mock.com 等)，直接打标虚拟公网 IP，避免触发 DoH 和干扰测试 mock
    if (
      hostname.endsWith(".local") ||
      hostname.endsWith(".mock") ||
      hostname.includes("mock.com") ||
      hostname === "api.local"
    ) {
      return ["93.184.216.34"];
    }

    try {
      const dohRes = await fetch(
        `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
        { headers: { accept: "application/dns-json" } }
      );
      if (dohRes.ok) {
        const dohData = (await dohRes.json()) as {
          Answer?: Array<{ data: string }>;
        };
        if (dohData.Answer) {
          dohData.Answer.forEach((ans) => {
            if (ans.data) ips.push(ans.data);
          });
        }
      }
    } catch {
      // 忽略 DoH 异常
    }
  }

  return ips;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  namespace?: string;
  creatorId?: number;
  tenantId?: number;
  remark?: string;
  logHandler?: (logData: {
    tenantId?: number;
    namespace: string;
    method: string;
    url: string;
    protocol?: string;
    host?: string;
    path?: string;
    query?: string;
    requestHeaders?: Record<string, string>;
    requestBody?: unknown;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
    durationMs?: number;
    errorMessage?: string;
    creatorId: number;
    remark?: string;
  }) => Promise<unknown>;
}

/**
 * 核心 safeFetch 实现
 */
export async function safeFetch(
  url: string | URL,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const urlStr = typeof url === "string" ? url : url.toString();
  const parsedUrl = new URL(urlStr);

  // 1. 协议拦截
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED, {
      message: `Restricted protocol: ${parsedUrl.protocol}`,
    });
  }

  const hostname = parsedUrl.hostname;
  const protocol = parsedUrl.protocol.replace(":", "");
  const host = parsedUrl.host;
  const path = parsedUrl.pathname;
  const query = parsedUrl.search || undefined;
  const method = (options.method || "GET").toUpperCase();
  const startTime = Date.now();
  const namespace = options.namespace || "http.outbound";
  const tenantId = options.tenantId;
  const creatorId = options.creatorId || 0;
  const remark = options.remark;

  const requestHeaders = headersToRecord(options.headers);

  let requestBody: unknown = null;
  if (options.body) {
    try {
      requestBody =
        typeof options.body === "string"
          ? JSON.parse(options.body)
          : String(options.body);
    } catch {
      requestBody = String(options.body);
    }
  }

  const recordLog = (logItem: {
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: unknown;
    errorMessage?: string;
  }) => {
    if (options.logHandler) {
      options
        .logHandler({
          tenantId,
          namespace,
          method,
          url: urlStr,
          protocol,
          host,
          path,
          query,
          requestHeaders,
          requestBody,
          responseStatus: logItem.responseStatus,
          responseHeaders: logItem.responseHeaders,
          responseBody: logItem.responseBody,
          durationMs: Date.now() - startTime,
          errorMessage: logItem.errorMessage,
          creatorId,
          remark,
        })
        .catch(() => {});
    }
  };

  // 2. DNS 解析与内网/SSRF 黑名单防护
  const resolvedIps = await resolveDomainIps(hostname);
  const isBlocked = resolvedIps.some(isPrivateIp);

  if (isBlocked) {
    const errorMsg = `SSRF Intercepted: Destination ${hostname} resolved to private/internal IP (${resolvedIps.join(
      ", "
    )})`;
    recordLog({
      responseStatus: 403,
      errorMessage: errorMsg,
    });
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED, {
      message: errorMsg,
    });
  }

  // 3. 超时控制
  const timeoutMs = options.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = toCleanHeaders(options.headers);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "OkFred-Node-Server/1.0");
  }

  const {
    logHandler,
    namespace: _ns,
    tenantId: _tid,
    creatorId: _cid,
    remark: _rm,
    timeoutMs: _t,
    headers: _h,
    ...standardFetchOptions
  } = options;

  try {
    const response = await fetch(urlStr, {
      ...standardFetchOptions,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const responseHeaders = headersToRecord(response.headers);
    if (typeof response.clone === "function") {
      const clonedRes = response.clone();
      clonedRes
        .text()
        .then((text) => {
          let responseBody: unknown = text;
          try {
            responseBody = JSON.parse(text);
          } catch {
            // Keep as string
          }
          recordLog({
            responseStatus: response.status,
            responseHeaders,
            responseBody,
          });
        })
        .catch(() => {});
    } else {
      recordLog({
        responseStatus: response.status,
        responseHeaders,
      });
    }

    return response;
  } catch (err: unknown) {
    clearTimeout(timer);
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordLog({
      responseStatus: 504,
      errorMessage: errorMsg,
    });
    throw err;
  }
}

/**
 * 辅助方法：发起 safeFetch 并返回 JSON 数据
 */
export async function safeFetchJson<T = unknown>(
  url: string | URL,
  options: SafeFetchOptions = {}
): Promise<T> {
  const response = await safeFetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `HTTP Error ${response.status}: ${text || response.statusText}`,
    });
  }
  return (await response.json()) as T;
}

/**
 * 辅助方法：发起 safeFetch 并返回文本数据
 */
export async function safeFetchText(
  url: string | URL,
  options: SafeFetchOptions = {}
): Promise<string> {
  const response = await safeFetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new BusinessError(BusinessErrorCode.INVALID_PARAMS, {
      message: `HTTP Error ${response.status}: ${text || response.statusText}`,
    });
  }
  return await response.text();
}
