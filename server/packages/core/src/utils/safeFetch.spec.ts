import { describe, it, expect, vi } from "vitest";
import { isPrivateIp, safeFetch, safeFetchJson } from "./safeFetch";
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
          url: "http://127.0.0.1/api/v1/test?token=%5BREDACTED%5D&page=1",
          protocol: "http",
          host: "127.0.0.1",
          path: "/api/v1/test",
          query: "?token=%5BREDACTED%5D&page=1",
          responseStatus: 403,
          namespace: "test.ssrf",
          remark: "SSRF Test",
        })
      );
    });

    it("should keep OAuth audit logs metadata-only", async () => {
      const mockLogHandler = vi.fn().mockResolvedValue(undefined);

      await expect(
        safeFetch(
          "http://127.0.0.1/oauth/token?code=sensitive-code&state=sensitive-state",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer sensitive-token",
              Cookie: "session=sensitive-cookie",
            },
            body: JSON.stringify({
              client_secret: "sensitive-secret",
              mobile: "13800138000",
            }),
            auditMode: "metadata-only",
            auditProvider: "feishu",
            logHandler: mockLogHandler,
          }
        )
      ).rejects.toThrow(BusinessError);

      const logged = mockLogHandler.mock.calls[0]?.[0];
      expect(logged).toEqual(
        expect.objectContaining({
          url: "http://127.0.0.1/oauth/token",
          host: "127.0.0.1",
          path: "/oauth/token",
          method: "POST",
          remark: "oauth:feishu",
        })
      );
      expect(JSON.stringify(logged)).not.toMatch(
        /sensitive-code|sensitive-state|sensitive-token|sensitive-cookie|sensitive-secret|13800138000/
      );
      expect(logged.query).toBeUndefined();
      expect(logged.requestHeaders).toBeUndefined();
      expect(logged.requestBody).toBeUndefined();
      expect(logged.responseBody).toBeUndefined();
    });

    it("should redact nested sensitive fields from standard HTTP errors", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: "sensitive-token",
            profile: { mobile: "13800138000" },
            message: "request failed",
          }),
          { status: 400, statusText: "Bad Request" }
        )
      );

      await expect(
        safeFetchJson("https://api.local/failure")
      ).rejects.toSatisfy((error: unknown) => {
        const message =
          error instanceof BusinessError &&
          typeof error.meta?.message === "string"
            ? error.meta.message
            : error instanceof Error
              ? error.message
              : String(error);
        return (
          !message.includes("sensitive-token") &&
          !message.includes("13800138000") &&
          message.includes("[REDACTED]")
        );
      });

      fetchMock.mockRestore();
    });
  });
});
