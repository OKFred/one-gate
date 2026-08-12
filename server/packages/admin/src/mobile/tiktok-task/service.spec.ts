import { describe, expect, it } from "vitest";
import service from "./service.js";

describe("TikTok 任务 HTTP API 契约", () => {
  it("仅导出 dispatch 纯 API 定义", () => {
    expect(Object.keys(service)).toEqual(["dispatch"]);
  });

  it("保持 POST /v2/dispatch 并复用设备任务 dispatch 权限", () => {
    expect(service.dispatch.pathInfo).toMatchObject({
      path: "/v2/dispatch",
      method: "post",
    });
    expect(service.dispatch.permission).toEqual({ action: "dispatch" });
  });

  it("请求 Schema 保持封闭字段和 v2 必填约束", () => {
    expect(Object.keys(service.dispatch.req.properties)).toEqual([
      "clientId",
      "contractVersion",
      "action",
      "publicationId",
      "expectedHandle",
      "media",
      "content",
      "policy",
      "link",
      "timeout",
      "priority",
      "preemptRunning",
      "remark",
    ]);
    expect(service.dispatch.req.required).toEqual([
      "clientId",
      "contractVersion",
      "action",
    ]);
    expect(service.dispatch.req.additionalProperties).toBe(false);
    expect(service.dispatch.req.properties.media.additionalProperties).toBe(
      false
    );
    expect(service.dispatch.req.properties.content.additionalProperties).toBe(
      false
    );
    expect(service.dispatch.req.properties.policy.additionalProperties).toBe(
      false
    );
    expect(service.dispatch.req.properties.link.additionalProperties).toBe(
      false
    );
  });

  it("响应 Schema 返回任务身份和 TikTok 关联字段", () => {
    expect(service.dispatch.res.required).toEqual([
      "taskId",
      "status",
      "traceId",
      "expiresAtUtc",
      "contractVersion",
      "action",
      "publicationId",
    ]);
    expect(service.dispatch.res.additionalProperties).toBe(false);
  });
});
