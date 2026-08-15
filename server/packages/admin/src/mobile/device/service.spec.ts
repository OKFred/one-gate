import { describe, expect, it } from "vitest";
import service from "./service.js";

describe("设备注册与上报 HTTP API 契约", () => {
  const apiShape = [
    ["list", "/list", "read"],
    ["add", "/add", "add"],
    ["update", "/update", "edit"],
    ["get", "/get", "read"],
    ["delete", "/delete", "delete"],
    ["updateMetadata", "/metadata/update", "edit"],
    ["eventList", "/event/list", "read"],
    ["reveal", "/sensitive/reveal", "view"],
    ["resetToken", "/report-token/reset", "edit"],
    ["reportPresence", "/report/presence", false],
    ["reportInfo", "/report/info", false],
    ["reportEvent", "/report/event", false],
  ] as const;

  it("仅导出原有十二个纯 API 定义", () => {
    expect(Object.keys(service)).toEqual(apiShape.map(([name]) => name));
  });

  it.each(apiShape)("%s 保持 POST %s 与原权限", (name, path, permission) => {
    expect(service[name].pathInfo).toMatchObject({ path, method: "post" });
    expect(service[name].permission).toEqual(
      permission === false ? false : { action: permission }
    );
  });

  it("管理与上报请求继续使用封闭 Schema", () => {
    expect(service.add.req.required).toEqual(["clientId", "isEnabled"]);
    expect(service.add.req.additionalProperties).toBe(false);
    expect(service.update.req.required).toEqual(["id"]);
    expect(service.update.req.additionalProperties).toBe(false);
    expect(service.updateMetadata.req.required).toEqual([
      "id",
      "customMetadata",
    ]);
    expect(service.eventList.req.required).toEqual([
      "deviceId",
      "pageNo",
      "pageSize",
    ]);
    expect(service.reportPresence.req.required).toEqual([
      "protocolVersion",
      "deviceId",
      "status",
      "timestamp",
    ]);
    expect(service.reportInfo.req.required).toEqual(
      Object.keys(service.reportInfo.req.properties)
    );
    expect(service.reportEvent.req.required).toEqual(
      Object.keys(service.reportEvent.req.properties)
    );
    expect(service.reportPresence.req.additionalProperties).toBe(false);
    expect(service.reportInfo.req.additionalProperties).toBe(false);
    expect(service.reportEvent.req.additionalProperties).toBe(false);
  });
});
