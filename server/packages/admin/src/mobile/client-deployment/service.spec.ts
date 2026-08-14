import { describe, expect, it } from "vitest";

import {
  clientDeploymentService,
  clientEnvironmentService,
  clientReleaseService,
} from "./service.js";

describe("客户端版本、环境与部署 HTTP 契约", () => {
  it("全部接口保持 POST 并使用约定路径", () => {
    expect(
      Object.values(clientReleaseService).map((api) => [
        api.pathInfo.path,
        api.pathInfo.method,
      ])
    ).toEqual([
      ["/upload/prepare", "post"],
      ["/upload/finalize", "post"],
      ["/list", "post"],
      ["/get", "post"],
      ["/revoke", "post"],
    ]);
    expect(
      Object.values(clientEnvironmentService).map((api) => [
        api.pathInfo.path,
        api.pathInfo.method,
      ])
    ).toEqual([
      ["/list", "post"],
      ["/get", "post"],
      ["/update", "post"],
    ]);
    expect(
      Object.values(clientDeploymentService).map((api) => [
        api.pathInfo.path,
        api.pathInfo.method,
      ])
    ).toEqual([
      ["/apply", "post"],
      ["/rollback", "post"],
      ["/get", "post"],
      ["/list", "post"],
    ]);
  });

  it("CI 上传端点仅用发布令牌，其余端点保留后台权限", () => {
    expect(clientReleaseService.uploadPrepare.permission).toBe(false);
    expect(clientReleaseService.uploadFinalize.permission).toBe(false);
    expect(clientReleaseService.revoke.permission).toEqual({
      action: "dispatch",
    });
    expect(clientEnvironmentService.update.permission).toEqual({
      action: "dispatch",
    });
    expect(clientDeploymentService.apply.permission).toEqual({
      action: "dispatch",
    });
    expect(clientDeploymentService.rollback.permission).toEqual({
      action: "dispatch",
    });
  });

  it("部署请求默认优雅切换且强制确认字段不可省略绕过服务校验", () => {
    expect(
      clientDeploymentService.apply.req.properties.activationMode
    ).toMatchObject({
      enum: ["GRACEFUL", "FORCE"],
      default: "GRACEFUL",
    });
    expect(clientDeploymentService.apply.req.properties.forceConfirmed).toEqual(
      {
        type: "boolean",
        default: false,
      }
    );
    expect(clientDeploymentService.apply.req.additionalProperties).toBe(false);
  });

  it("环境模板接口只接受配置和本地密钥键名", () => {
    expect(Object.keys(clientEnvironmentService.update.req.properties)).toEqual(
      ["environment", "config", "requiredSecretKeys"]
    );
    expect(clientEnvironmentService.update.req.additionalProperties).toBe(
      false
    );
  });
});
