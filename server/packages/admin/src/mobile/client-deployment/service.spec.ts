import { describe, expect, it } from "vitest";

import {
  classifyStorageConnectionError,
  clientDeploymentService,
  clientEnvironmentService,
  clientReleaseService,
  getMissingPresignedStorageFields,
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

  it("预签名存储配置按提供商报告缺失字段且不返回配置值", () => {
    expect(
      getMissingPresignedStorageFields({
        provider: "S3",
        endpoint: "https://example.invalid",
      })
    ).toEqual(["bucket", "accessKey", "secretKey", "region"]);
    expect(
      getMissingPresignedStorageFields({
        provider: "S3",
        endpoint: "https://example.invalid",
        region: "ap-southeast-1",
        bucket: "releases",
        accessKey: "configured",
        secretKey: "configured",
      })
    ).toEqual([]);
    expect(
      getMissingPresignedStorageFields({
        provider: "R2",
        bucket: "hodor",
        accessKey: "configured",
        secretKey: "configured",
      })
    ).toEqual(["accountId"]);
    expect(
      getMissingPresignedStorageFields({
        provider: "R2",
        bucket: "hodor",
        accessKey: "configured",
        secretKey: "configured",
        accountId: "configured",
      })
    ).toEqual([]);
  });

  it("对象存储连接异常只返回固定安全分类", () => {
    expect(
      classifyStorageConnectionError({ name: "SignatureDoesNotMatch" })
    ).toBe("对象存储连接检查失败: S3 签名或 Region 不匹配");
    expect(
      classifyStorageConnectionError({
        name: "S3ServiceException",
        $metadata: { httpStatusCode: 403 },
      })
    ).toBe("对象存储连接检查失败: S3 Access Key 无效或权限不足");
    expect(
      classifyStorageConnectionError({
        name: "S3ServiceException",
        code: "NoSuchBucket",
        $metadata: { httpStatusCode: 404 },
      })
    ).toBe("对象存储连接检查失败: Bucket 不存在");
    expect(
      classifyStorageConnectionError(new TypeError("secret endpoint"))
    ).toBe("对象存储连接检查失败: Endpoint 不可达或 TLS/网络异常");
    expect(classifyStorageConnectionError({ unexpected: "secret" })).toBe(
      "对象存储连接检查失败: 请核对 Provider、Endpoint、Region、Bucket 和访问密钥"
    );
  });
});
