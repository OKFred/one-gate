import { describe, expect, it } from "vitest";

import {
  DEFAULT_NETWORK_ROUTING_CONFIG,
  normalizeNetworkRoutingConfig,
  normalizePrivateIpv4Cidr,
} from "./domain.js";

describe("mobile network routing policy", () => {
  it("normalizes the default per-device policy", () => {
    expect(
      normalizeNetworkRoutingConfig({
        lanCidrs: [...DEFAULT_NETWORK_ROUTING_CONFIG.lanCidrs],
        lanProbeUrls: [...DEFAULT_NETWORK_ROUTING_CONFIG.lanProbeUrls],
        internetProbeUrl: DEFAULT_NETWORK_ROUTING_CONFIG.internetProbeUrl,
        probeTimeoutMs: DEFAULT_NETWORK_ROUTING_CONFIG.probeTimeoutMs,
      })
    ).toEqual({
      lanCidrs: ["192.168.0.0/16"],
      lanProbeUrls: ["http://192.168.1.4/", "http://192.168.12.1:8080/"],
      internetProbeUrl: "http://ip.3322.net/",
      probeTimeoutMs: 10_000,
    });
  });

  it("rejects non-canonical or public routes and probes outside LAN", () => {
    expect(() => normalizePrivateIpv4Cidr("192.168.1.1/16")).toThrow(
      /规范网络地址/
    );
    expect(() => normalizePrivateIpv4Cidr("8.8.8.0/24")).toThrow(/RFC1918/);
    expect(() =>
      normalizeNetworkRoutingConfig({
        lanCidrs: ["192.168.0.0/16"],
        lanProbeUrls: ["http://10.0.0.1/"],
        internetProbeUrl: "http://ip.3322.net/",
        probeTimeoutMs: 10_000,
      })
    ).toThrow(/CIDR/);
  });
});
