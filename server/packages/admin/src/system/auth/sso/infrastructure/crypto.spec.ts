import { beforeEach, describe, expect, it } from "vitest";
import { setEnv } from "@hodor/core/utils/env";
import {
  webCryptoSsoCipher,
  webCryptoSsoHash,
  webCryptoSsoRandom,
} from "./crypto.js";

describe("SSO Web Crypto infrastructure", () => {
  beforeEach(() => {
    setEnv({
      HODOR_AUTH_MASTER_KEY: Buffer.alloc(32, 11).toString("base64"),
      OAUTH_SENSITIVE_DATA_KEY: Buffer.alloc(32, 11).toString("base64"),
    });
  });

  it("生成随机 base64url 值和 SHA-256 base64url 摘要", async () => {
    const first = webCryptoSsoRandom.randomBase64Url(32);
    const second = webCryptoSsoRandom.randomBase64Url(32);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second).not.toBe(first);
    await expect(webCryptoSsoHash.sha256Base64Url("hello")).resolves.toBe(
      "LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ"
    );
  });

  it("使用 HODOR_AUTH_MASTER_KEY、AES-GCM 和 AAD 保护 verifier", async () => {
    const verifier = "sensitive-pkce-verifier-sentinel";
    const aad = "system_sso_oidc_transaction:tx-1:pkce-verifier";
    const encrypted = await webCryptoSsoCipher.encrypt(verifier, aad);

    expect(encrypted).toMatch(/^v1\./u);
    expect(encrypted).not.toContain(verifier);
    await expect(webCryptoSsoCipher.decrypt(encrypted, aad)).resolves.toBe(
      verifier
    );
    await expect(
      webCryptoSsoCipher.decrypt(
        encrypted,
        "system_sso_oidc_transaction:tx-2:pkce-verifier"
      )
    ).rejects.toThrow();
  });

  it("拒绝错误长度的根密钥和篡改密文", async () => {
    setEnv({ HODOR_AUTH_MASTER_KEY: Buffer.alloc(16).toString("base64") });
    await expect(webCryptoSsoCipher.encrypt("verifier", "aad")).rejects.toThrow(
      "32 bytes"
    );

    setEnv({
      HODOR_AUTH_MASTER_KEY: Buffer.alloc(32, 11).toString("base64"),
    });
    const encrypted = await webCryptoSsoCipher.encrypt("verifier", "aad");
    const [version, iv, payload] = encrypted.split(".");
    const tampered = `${version}.${iv}.${payload.slice(0, -1)}${
      payload.endsWith("A") ? "B" : "A"
    }`;
    await expect(webCryptoSsoCipher.decrypt(tampered, "aad")).rejects.toThrow();
  });

  it("迁移期仅在新根密钥缺失时回退旧名称", async () => {
    setEnv({
      HODOR_AUTH_MASTER_KEY: "",
      OAUTH_SENSITIVE_DATA_KEY: Buffer.alloc(32, 12).toString("base64"),
    });
    const encrypted = await webCryptoSsoCipher.encrypt("verifier", "aad");
    await expect(webCryptoSsoCipher.decrypt(encrypted, "aad")).resolves.toBe(
      "verifier"
    );

    setEnv({
      HODOR_AUTH_MASTER_KEY: Buffer.alloc(32, 13).toString("base64"),
      OAUTH_SENSITIVE_DATA_KEY: Buffer.alloc(16).toString("base64"),
    });
    await expect(webCryptoSsoCipher.encrypt("new-key", "aad")).resolves.toMatch(
      /^v1\./u
    );
  });
});
