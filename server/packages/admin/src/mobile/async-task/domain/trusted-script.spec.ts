import { describe, expect, it } from "vitest";
import {
  DeviceTaskRuleViolation,
  calculateTaskTimeoutMs,
  defaultTaskPriority,
  normalizeResultGraceMs,
  prepareTrustedTask,
  validateDeviceClientId,
  validateTrustedScriptParams,
} from "./trusted-script.js";

describe("可信设备脚本领域规则", () => {
  it.each(["device-01", "device.example:1883", "A_b.c-1"])(
    "接受可安全用于 MQTT Topic 的设备 ID: %s",
    (clientId) => {
      expect(() => validateDeviceClientId(clientId)).not.toThrow();
    }
  );

  it.each(["", "device/01", "含中文", "x".repeat(101)])(
    "拒绝非法设备 ID: %s",
    (clientId) => {
      expect(() => validateDeviceClientId(clientId)).toThrow(
        DeviceTaskRuleViolation
      );
    }
  );

  it("校验安装与压缩包更新必须使用 HTTPS", () => {
    expect(() =>
      validateTrustedScriptParams("app.install", {
        downloadUrl: "https://example.com/app.apk",
      })
    ).not.toThrow();
    expect(() =>
      validateTrustedScriptParams("app.update.zip", {
        downloadUrl: "http://example.com/update.zip",
      })
    ).toThrow("仅允许 HTTPS");
  });

  it("校验应用列表类型与文件下载目标目录", () => {
    expect(() =>
      validateTrustedScriptParams("device.apps.list", { type: "third" })
    ).not.toThrow();
    expect(() =>
      validateTrustedScriptParams("device.apps.list", { type: "unknown" })
    ).toThrow("仅支持 all/third/system");
    expect(() =>
      validateTrustedScriptParams("file.download", {
        downloadUrl: "http://example.com/archive.zip",
        targetPath: "/sdcard/Download/archive.zip",
      })
    ).not.toThrow();
    expect(() =>
      validateTrustedScriptParams("file.download", {
        downloadUrl: "ftp://example.com/archive.zip",
        targetPath: "/data/archive.zip",
      })
    ).toThrow("仅允许 HTTP/HTTPS");
  });

  it("校验网络切换目标和探测超时", () => {
    expect(() =>
      validateTrustedScriptParams("device.network.switch", {
        target: "WiFi",
        timeoutMs: 120_000,
      })
    ).not.toThrow();
    expect(() =>
      validateTrustedScriptParams("device.network.switch", {
        target: "bluetooth",
      })
    ).toThrow("仅支持 wifi/ethernet/carrier");
    expect(() =>
      validateTrustedScriptParams("device.network.switch", {
        target: "carrier",
        timeoutMs: 999,
      })
    ).toThrow("必须介于1000到120000");
  });

  it("应用包名只允许安全字符", () => {
    expect(() =>
      validateTrustedScriptParams("app.update.store", {
        packageName: "com.example.app",
        storePackage: "com.android.vending",
      })
    ).not.toThrow();
    expect(() =>
      validateTrustedScriptParams("app.update.store", {
        packageName: "com.example/app",
      })
    ).toThrow("应用包名格式无效");
  });

  it("默认优先级仅对网络切换使用 HIGH", () => {
    expect(defaultTaskPriority("device.network.switch")).toBe("HIGH");
    expect(defaultTaskPriority("device.apps.list")).toBe("NORMAL");
  });

  it("将普通脚本超时裁剪到 1 秒和脚本上限之间", () => {
    expect(calculateTaskTimeoutMs("device.apps.list", {}, 100)).toBe(1_000);
    expect(calculateTaskTimeoutMs("device.apps.list", {}, 1_000_000)).toBe(
      300_000
    );
    expect(calculateTaskTimeoutMs("device.apps.list", {})).toBe(120_000);
  });

  it("拒绝非有限数值的超时", () => {
    expect(() =>
      calculateTaskTimeoutMs("device.apps.list", {}, Number.NaN)
    ).toThrow("任务超时必须是有限数值");
    expect(() =>
      calculateTaskTimeoutMs("device.apps.list", {}, Number.POSITIVE_INFINITY)
    ).toThrow("任务超时必须是有限数值");
  });

  it("网络切换额外预留 20 秒结果时间且不突破上限", () => {
    expect(
      calculateTaskTimeoutMs(
        "device.network.switch",
        { target: "wifi", timeoutMs: 80_000 },
        30_000
      )
    ).toBe(100_000);
    expect(
      calculateTaskTimeoutMs(
        "device.network.switch",
        { target: "carrier", timeoutMs: 120_000 },
        900_000
      )
    ).toBe(150_000);
  });

  it("准备任务时限制参数体积并要求 HTTPS 回调", () => {
    expect(() =>
      prepareTrustedTask({
        scriptId: "device.apps.list",
        params: { payload: "中".repeat(22_000) },
      })
    ).toThrow("任务参数不能超过 65536 字节");
    expect(() =>
      prepareTrustedTask({
        scriptId: "device.apps.list",
        params: {},
        callbackUrl: "http://example.com/callback",
      })
    ).toThrow("仅支持 HTTPS");
    expect(() =>
      prepareTrustedTask({
        scriptId: "device.apps.list",
        params: {},
        callbackUrl: "not-a-url",
      })
    ).toThrow(TypeError);

    expect(
      prepareTrustedTask({
        scriptId: "device.apps.list",
        params: { type: "all" },
        callbackUrl: "https://example.com/callback",
      })
    ).toMatchObject({
      paramsJson: JSON.stringify({ type: "all" }),
      priority: "NORMAL",
      preemptRunning: false,
      timeoutMs: 120_000,
      callbackUrl: "https://example.com/callback",
    });
  });

  it.each([
    { input: undefined, expected: 30_000 },
    { input: "1000", expected: 1_000 },
    { input: -1, expected: 0 },
    { input: 900_000, expected: 300_000 },
    { input: "not-a-number", expected: 30_000 },
  ])("裁剪结果宽限值 $input 为 $expected", ({ input, expected }) => {
    expect(normalizeResultGraceMs(input)).toBe(expected);
  });
});
