import { describe, expect, it } from "vitest";
import service from "./service.js";

describe("设备任务 HTTP API 契约", () => {
  it("仅导出 list、dispatch、get、callback 四个纯 API 定义", () => {
    expect(Object.keys(service)).toEqual([
      "list",
      "dispatch",
      "get",
      "callback",
    ]);
  });

  it.each([
    ["list", "/list"],
    ["dispatch", "/dispatch"],
    ["get", "/get"],
    ["callback", "/callback"],
  ] as const)("%s 保持 POST %s", (name, path) => {
    expect(service[name].pathInfo).toMatchObject({
      path,
      method: "post",
    });
  });

  it("回调端点免后台权限，其余端点保持业务权限", () => {
    expect(service.list.permission).toEqual({ action: "read" });
    expect(service.dispatch.permission).toEqual({ action: "dispatch" });
    expect(service.get.permission).toEqual({ action: "read" });
    expect(service.callback.permission).toBe(false);
  });

  it("请求与响应 Schema 保持封闭字段和必填约束", () => {
    expect(Object.keys(service.list.req.properties)).toEqual([
      "descend",
      "keyword",
      "pageNo",
      "pageSize",
      "clientId",
      "status",
      "priority",
      "orderBy",
    ]);
    expect(service.list.req.additionalProperties).toBe(false);

    expect(Object.keys(service.dispatch.req.properties)).toEqual([
      "clientId",
      "scriptId",
      "params",
      "timeoutMs",
      "priority",
      "preemptRunning",
      "remark",
    ]);
    expect(service.dispatch.req.required).toEqual([
      "clientId",
      "scriptId",
      "params",
    ]);
    expect(service.dispatch.req.additionalProperties).toBe(false);
    expect(service.dispatch.res.required).toEqual([
      "taskId",
      "status",
      "traceId",
      "expiresAtUtc",
    ]);
    expect(service.dispatch.res.additionalProperties).toBe(false);

    expect(Object.keys(service.get.req.properties)).toEqual(["taskId"]);
    expect(service.get.req.required).toEqual(["taskId"]);
    expect(service.get.req.additionalProperties).toBe(false);

    expect(Object.keys(service.callback.req.properties)).toEqual([
      "protocolVersion",
      "taskId",
      "deviceId",
      "scriptId",
      "status",
      "code",
      "message",
      "data",
      "startedAt",
      "finishedAt",
      "durationMs",
      "traceId",
    ]);
    expect(service.callback.req.required).toEqual([
      "protocolVersion",
      "taskId",
      "deviceId",
      "scriptId",
      "status",
      "code",
      "message",
      "data",
      "startedAt",
      "finishedAt",
      "durationMs",
      "traceId",
    ]);
    expect(service.callback.req.additionalProperties).toBe(false);
    expect(service.callback.res).toEqual({ type: "boolean" });
  });
});
