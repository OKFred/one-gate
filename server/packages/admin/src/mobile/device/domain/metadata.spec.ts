import { describe, expect, it } from "vitest";
import {
  SENSITIVE_METADATA_PLACEHOLDER,
  maskCustomMetadata,
  parseJsonRecord,
  splitCustomMetadata,
  validateCustomMetadata,
  validateReportedExtra,
} from "./metadata.js";

describe("设备元数据领域规则", () => {
  it("接收有限深度的普通 reportedExtra", () => {
    expect(
      validateReportedExtra({
        locale: "zh-CN",
        flags: [true, false],
        deployment: {
          releaseVersion: "v2.1.3",
          releaseDigest: "a".repeat(64),
          environment: "development",
          environmentRevision: 4,
          lastDeploymentId: null,
        },
      })
    ).toEqual({
      locale: "zh-CN",
      flags: [true, false],
      deployment: {
        releaseVersion: "v2.1.3",
        releaseDigest: "a".repeat(64),
        environment: "development",
        environmentRevision: 4,
        lastDeploymentId: null,
      },
    });
  });

  it.each(["imei", "report_token", "phoneNumber", "deviceId"])(
    "拒绝敏感或保留上报键 %s",
    (key) => {
      expect(() => validateReportedExtra({ [key]: "secret" })).toThrow(
        "Sensitive or reserved reportedExtra key"
      );
    }
  );

  it("递归拒绝嵌套对象中的敏感或保留字段", () => {
    expect(() =>
      validateReportedExtra({ deployment: { reportToken: "secret" } })
    ).toThrow("Sensitive or reserved reportedExtra key");
  });

  it("拒绝非有限数字、非法键和超深数组", () => {
    expect(() => validateReportedExtra({ score: Number.NaN })).toThrow(
      "Metadata number must be finite"
    );
    expect(() => validateReportedExtra({ "bad key": true })).toThrow(
      "Invalid metadata key"
    );
    expect(() => validateReportedExtra({ value: [[[["deep"]]]] })).toThrow(
      "Metadata nesting exceeds depth 3"
    );
  });

  it("敏感语义的管理员字段必须标记 sensitive", () => {
    expect(() =>
      validateCustomMetadata({ tokenAlias: { value: "x", sensitive: false } })
    ).toThrow("Sensitive custom metadata key must be encrypted");
    expect(
      validateCustomMetadata({ tokenAlias: { value: "x", sensitive: true } })
    ).toEqual({ tokenAlias: { value: "x", sensitive: true } });
  });

  it("拆分敏感字段并为列表生成统一占位符", () => {
    const metadata = validateCustomMetadata({
      owner: { value: "fred", sensitive: false },
      secret: { value: "value", sensitive: true },
    });
    const { plain, sensitive } = splitCustomMetadata(metadata);
    expect(plain).toEqual({ owner: { value: "fred", sensitive: false } });
    expect(sensitive).toEqual({
      secret: { value: "value", sensitive: true },
    });
    expect(maskCustomMetadata(plain, Object.keys(sensitive))).toEqual({
      owner: { value: "fred", sensitive: false },
      secret: { value: SENSITIVE_METADATA_PLACEHOLDER, sensitive: true },
    });
  });

  it("历史无效 JSON 安全退化为空对象", () => {
    expect(parseJsonRecord('{"ok":true}')).toEqual({ ok: true });
    expect(parseJsonRecord("[]")).toEqual({});
    expect(parseJsonRecord("invalid")).toEqual({});
    expect(parseJsonRecord(null)).toEqual({});
  });
});
