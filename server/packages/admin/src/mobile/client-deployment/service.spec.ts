import { describe, expect, it } from "vitest";

import {
  classifyStorageConnectionError,
  clientDeploymentService,
  clientEnvironmentService,
  clientReleaseService,
  getMissingPresignedStorageFields,
  getReleaseArtifactMetadataValidationError,
  MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY,
  RELEASE_UPLOAD_TICKET_MAX_LENGTH,
} from "./service.js";

describe("客户端版本、环境与部署 HTTP 契约", () => {
  it("finalize 票据上限可容纳大型清单但仍保持有界", () => {
    expect(RELEASE_UPLOAD_TICKET_MAX_LENGTH).toBe(1_000_000);
    expect(RELEASE_UPLOAD_TICKET_MAX_LENGTH).toBeGreaterThan(320_000);
  });

  it("发布制品固定使用独立 OSS 配置且不复用默认配置", () => {
    expect(MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY).toBe(
      "mobile-client-release"
    );
  });

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

  it("finalize 兼容不回传自定义摘要的 S3 服务", () => {
    const expected = {
      artifactSize: 2_128_000,
      artifactSha256: "a".repeat(64),
    };

    expect(
      getReleaseArtifactMetadataValidationError(
        {
          key: "mobile-client/releases/v2.0.1/artifact.tar.gz",
          size: expected.artifactSize,
          contentType: "application/gzip",
        },
        expected
      )
    ).toBeNull();
    expect(
      getReleaseArtifactMetadataValidationError(
        {
          key: "mobile-client/releases/v2.0.1/artifact.tar.gz",
          size: expected.artifactSize,
          contentType: "application/gzip",
          customMetadata: { sha256: expected.artifactSha256 },
        },
        expected
      )
    ).toBeNull();
  });

  it("finalize 拒绝缺失对象及不一致的大小、MIME 和显式摘要", () => {
    const expected = {
      artifactSize: 2_128_000,
      artifactSha256: "a".repeat(64),
    };

    expect(getReleaseArtifactMetadataValidationError(null, expected)).toBe(
      "上传制品不存在"
    );
    expect(
      getReleaseArtifactMetadataValidationError(
        { key: "artifact.tar.gz", size: expected.artifactSize - 1 },
        expected
      )
    ).toBe("上传制品大小与票据不一致");
    expect(
      getReleaseArtifactMetadataValidationError(
        { key: "artifact.tar.gz", size: expected.artifactSize },
        expected
      )
    ).toBe("上传制品 MIME 与发布格式不一致");
    expect(
      getReleaseArtifactMetadataValidationError(
        {
          key: "artifact.tar.gz",
          size: expected.artifactSize,
          contentType: "application/octet-stream",
        },
        expected
      )
    ).toBe("上传制品 MIME 与发布格式不一致");
    expect(
      getReleaseArtifactMetadataValidationError(
        {
          key: "artifact.tar.gz",
          size: expected.artifactSize,
          contentType: "application/gzip",
          customMetadata: { sha256: "b".repeat(64) },
        },
        expected
      )
    ).toBe("上传制品摘要元数据与票据不一致");
  });
});
