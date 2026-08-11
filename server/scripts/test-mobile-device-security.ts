import { setEnv } from "@hodor/core/utils/env";
import {
  decryptSensitiveText,
  encryptSensitiveText,
  generateDeviceToken,
  verifyDeviceToken,
} from "@hodor/admin/mobile/device/crypto";
import {
  validateCustomMetadata,
  validateReportedExtra,
} from "@hodor/admin/mobile/device/metadata";

/** 断言安全单元测试条件。 */
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** 验证跨 Node/Worker 的密文格式、令牌摘要与元数据约束。 */
async function main(): Promise<void> {
  setEnv({
    MOBILE_SENSITIVE_DATA_KEY:
      process.env.MOBILE_SENSITIVE_DATA_KEY ||
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  });
  const aad = "mobile-device:test:field";
  const plaintext = "sensitive-security-test";
  const ciphertext = await encryptSensitiveText(plaintext, aad);
  assert(ciphertext.startsWith("v1."), "Unexpected cipher version");
  assert(ciphertext !== plaintext, "Sensitive value was not encrypted");
  assert(
    (await decryptSensitiveText(ciphertext, aad)) === plaintext,
    "AES-GCM roundtrip failed"
  );

  const generated = await generateDeviceToken();
  assert(
    await verifyDeviceToken(generated.token, generated.tokenHash),
    "Generated token could not be verified"
  );
  assert(
    !(await verifyDeviceToken("wrong-token", generated.tokenHash)),
    "Wrong token was accepted"
  );

  validateReportedExtra({ deploymentGroup: "test", metrics: [1, 2, 3] });
  validateCustomMetadata({
    assetCode: { value: "A-001", sensitive: false },
    owner: { value: "restricted", sensitive: true },
  });
  let rejectedSensitiveExtra = false;
  try {
    validateReportedExtra({ imeiBackup: "forbidden" });
  } catch {
    rejectedSensitiveExtra = true;
  }
  assert(rejectedSensitiveExtra, "Sensitive reportedExtra key was accepted");

  let rejectedPlainSensitiveCustom = false;
  try {
    validateCustomMetadata({
      phoneNumber: { value: "test", sensitive: false },
    });
  } catch {
    rejectedPlainSensitiveCustom = true;
  }
  assert(
    rejectedPlainSensitiveCustom,
    "Sensitive custom metadata key was stored without encryption"
  );

  const tooMany = Object.fromEntries(
    Array.from({ length: 51 }, (_, index) => [`key${index}`, index])
  );
  let rejectedTooMany = false;
  try {
    validateReportedExtra(tooMany);
  } catch {
    rejectedTooMany = true;
  }
  assert(rejectedTooMany, "Metadata key limit was not enforced");
  console.log("mobile device security: PASS");
}

await main();
