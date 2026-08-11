import { describe, expect, it } from "vitest";
import { buildTaskCallbackUrl } from "./callback-url.js";

describe("设备任务 HTTP 回调地址", () => {
  it("将 HTTPS 管理端请求改写为同源回调并清除查询与片段", () => {
    expect(
      buildTaskCallbackUrl(
        "https://api.example.com/admin/mobile/async-task/dispatch?foo=bar#hash"
      )
    ).toBe("https://api.example.com/admin/mobile/async-task/callback");
  });

  it("HTTP 请求不下发回调地址，非法 URL 保持原生异常", () => {
    expect(
      buildTaskCallbackUrl("http://api.example.com/admin/mobile/dispatch")
    ).toBeUndefined();
    expect(() => buildTaskCallbackUrl("not-a-url")).toThrow(TypeError);
  });
});
