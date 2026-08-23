import { describe, expect, it } from "vitest";

import {
  DEFAULT_NETWORK_ROUTING_CONFIG,
  normalizeNetworkRoutingConfig,
  normalizePrivateIpv4Cidr,
  parseNetworkRoutingStatusEvent,
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

  it("accepts a non-sensitive runtime status and rejects stale shapes", () => {
    const status = {
      protocolVersion: 1,
      deviceId: "phone-001",
      generation: 8,
      policyRevision: 3,
      target: "carrier",
      state: "RECOVERING",
      code: "NETWORK_CHANGE_DETECTED",
      message: "Reconciling routing after a network change",
      timestamp: 1_700_000_000_000,
      verifiedAt: 1_699_999_999_000,
      wifiInterface: "wlan0",
      carrierInterface: "rmnet_data2",
    } as const;
    expect(parseNetworkRoutingStatusEvent(status)).toEqual(status);
    expect(
      parseNetworkRoutingStatusEvent({ ...status, publicIpv4: "203.0.113.1" })
    ).toBeNull();
    expect(
      parseNetworkRoutingStatusEvent({
        ...status,
        state: "DISABLED",
        target: "carrier",
      })
    ).toBeNull();
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
