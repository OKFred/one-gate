import { setEnv } from "@hodor/core/utils/env";
import { beforeEach, describe, expect, it } from "vitest";
import { webCryptoAuthorizationCipher } from "./crypto.js";

describe("Authorization credential cipher", () => {
  beforeEach(() => {
    setEnv({
      HODOR_AUTH_MASTER_KEY: Buffer.alloc(32, 19).toString("base64"),
    });
  });

  it("uses AES-GCM and record AAD without exposing plaintext", async () => {
    const secret = "authorization-client-secret-sentinel";
    const aad = "system_authorization_connection:default:client_secret:v1";
    const ciphertext = await webCryptoAuthorizationCipher.encrypt(secret, aad);

    expect(ciphertext).toMatch(/^v1\./u);
    expect(ciphertext).not.toContain(secret);
    await expect(
      webCryptoAuthorizationCipher.decrypt(ciphertext, aad)
    ).resolves.toBe(secret);
    await expect(
      webCryptoAuthorizationCipher.decrypt(ciphertext, `${aad}:other`)
    ).rejects.toThrow();
  });

  it("rejects missing, short and tampered key material", async () => {
    setEnv({ HODOR_AUTH_MASTER_KEY: "" });
    await expect(
      webCryptoAuthorizationCipher.encrypt("secret", "aad")
    ).rejects.toThrow("required");

    setEnv({
      HODOR_AUTH_MASTER_KEY: Buffer.alloc(16).toString("base64"),
    });
    await expect(
      webCryptoAuthorizationCipher.encrypt("secret", "aad")
    ).rejects.toThrow("32 bytes");
  });
});
