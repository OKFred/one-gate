import { describe, it, expect, vi } from "vitest";
import { isPrivateIp, safeFetch } from "./safeFetch";
import { BusinessError } from "../middleware/errorHandler/businessError/index";

describe("safeFetch & SSRF Protection", () => {
  describe("isPrivateIp (CIDR & Subnet Calculation)", () => {
    it("should correctly identify private / loopback / cloud-metadata IPv4 addresses", () => {
      expect(isPrivateIp("127.0.0.1")).toBe(true);
      expect(isPrivateIp("127.0.1.100")).toBe(true);
      expect(isPrivateIp("10.0.0.1")).toBe(true);
      expect(isPrivateIp("10.255.255.254")).toBe(true);
      expect(isPrivateIp("172.16.0.1")).toBe(true);
      expect(isPrivateIp("172.31.255.255")).toBe(true);
      expect(isPrivateIp("192.168.0.1")).toBe(true);
      expect(isPrivateIp("192.168.1.254")).toBe(true);
      expect(isPrivateIp("169.254.169.254")).toBe(true); // Cloud Metadata
      expect(isPrivateIp("0.0.0.0")).toBe(true);
      expect(isPrivateIp("localhost")).toBe(true);
    });

    it("should correctly identify private IPv6 addresses", () => {
      expect(isPrivateIp("::1")).toBe(true);
      expect(isPrivateIp("fc00::1")).toBe(true);
      expect(isPrivateIp("fd12:3456:789a:1::1")).toBe(true);
      expect(isPrivateIp("fe80::1")).toBe(true);
    });

    it("should allow public IPv4 addresses", () => {
      expect(isPrivateIp("8.8.8.8")).toBe(false);
      expect(isPrivateIp("1.1.1.1")).toBe(false);
      expect(isPrivateIp("140.82.121.4")).toBe(false);
      expect(isPrivateIp("172.32.0.1")).toBe(false);
    });
  });

  describe("safeFetch Protocol, URL Decomposition & SSRF Interception", () => {
    it("should reject non-http/https protocols", async () => {
      await expect(safeFetch("file:///etc/passwd")).rejects.toThrow(
        BusinessError
      );
    });

    it("should decompose URL into protocol, host, path, query and log when SSRF intercepted", async () => {
      const mockLogHandler = vi.fn().mockResolvedValue(undefined);

      await expect(
        safeFetch("http://127.0.0.1/api/v1/test?token=abc&page=1", {
          logHandler: mockLogHandler,
          namespace: "test.ssrf",
          remark: "SSRF Test",
        })
      ).rejects.toThrow(BusinessError);

      expect(mockLogHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "http://127.0.0.1/api/v1/test?token=abc&page=1",
          protocol: "http",
          host: "127.0.0.1",
          path: "/api/v1/test",
          query: "?token=abc&page=1",
          responseStatus: 403,
          namespace: "test.ssrf",
          remark: "SSRF Test",
        })
      );
    });
  });
});
