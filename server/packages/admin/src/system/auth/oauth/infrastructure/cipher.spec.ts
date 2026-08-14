import { beforeEach, describe, expect, it } from "vitest";
import { setEnv } from "@hodor/core/utils/env";
import { webCryptoOAuthCipher } from "./cipher.js";

describe("OAuth AES-GCM cipher", () => {
  beforeEach(() => {
    setEnv({
      OAUTH_SENSITIVE_DATA_KEY: Buffer.alloc(32, 7).toString("base64"),
    });
  });

  it("密文不包含明文并绑定 AAD", async () => {
    const plaintext = JSON.stringify({ mobile: "+8613800000000" });
    const aad = "system_user_oauth:1:feishu:ou_1:profile";
    const ciphertext = await webCryptoOAuthCipher.encrypt(plaintext, aad);
    expect(ciphertext).toMatch(/^v1\./);
    expect(ciphertext).not.toContain("+8613800000000");
    await expect(webCryptoOAuthCipher.decrypt(ciphertext, aad)).resolves.toBe(
      plaintext
    );
    await expect(
      webCryptoOAuthCipher.decrypt(
        ciphertext,
        "system_user_oauth:2:feishu:ou_1:profile"
      )
    ).rejects.toThrow();
  });

  it("篡改密文后无法解密", async () => {
    const aad = "system_user_oauth:1:github:1:access-token";
    const ciphertext = await webCryptoOAuthCipher.encrypt("secret", aad);
    const [version, iv, payload] = ciphertext.split(".");
    const first = payload[0];
    const tampered = `${version}.${iv}.${first === "A" ? "B" : "A"}${payload.slice(1)}`;
    await expect(webCryptoOAuthCipher.decrypt(tampered, aad)).rejects.toThrow();
  });
});
