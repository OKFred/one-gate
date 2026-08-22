import { afterEach, describe, expect, it, vi } from "vitest";

import type { Context, UserObj } from "@hodor/core/types/app";
import type { MobileClientDeployment, MobileClientRelease } from "./model.js";
import {
  clientDeploymentRepository,
  type EnvironmentRevisionView,
} from "./repository.js";

import {
  classifyStorageConnectionError,
  clientDeploymentService,
  clientEnvironmentService,
  clientReleaseService,
  getMissingPresignedStorageFields,
  getReleaseArtifactMetadataValidationError,
  isSameDeploymentCombination,
  MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY,
  parseReportedDeployment,
  RELEASE_UPLOAD_TICKET_MAX_LENGTH,
} from "./service.js";

const release = {
  id: 7,
  releaseVersion: "v2.1.7",
  artifactKey: "mobile-client/releases/v2.1.7/artifact.tar.gz",
  artifactSha256: "a".repeat(64),
  artifactSize: 1024,
  manifestJson: "{}",
  status: "PUBLISHED",
  releaseNotes: null,
  creatorId: 1,
  updaterId: null,
  createTimeUtc: 1,
  updateTimeUtc: null,
} as const satisfies MobileClientRelease;

const environment = {
  environment: {
    id: 3,
    name: "production",
    activeRevisionId: 31,
    isEnabled: true,
    creatorId: 1,
    updaterId: null,
    createTimeUtc: 1,
    updateTimeUtc: null,
  },
  revision: {
    id: 31,
    environmentId: 3,
    revision: 1,
    configJson: "{}",
    requiredSecretKeysJson: "[]",
    creatorId: 1,
    createTimeUtc: 1,
  },
  config: {},
  requiredSecretKeys: [],
} as const satisfies EnvironmentRevisionView;

const reportedExtraJson = JSON.stringify({
  deployment: {
    releaseVersion: release.releaseVersion,
    releaseDigest: release.artifactSha256,
    environment: environment.environment.name,
    environmentRevision: environment.revision.revision,
  },
});

const user = { id: 1 } as UserObj;
const context = {} as Context;

describe("客户端版本、环境与部署 HTTP 契约", () => {
  afterEach(() => vi.restoreAllMocks());

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

  it("设备当前版本、摘要、环境和修订全部相同时识别为无变化部署", () => {
    const current = parseReportedDeployment(
      JSON.stringify({
        deployment: {
          releaseVersion: "v2.1.7",
          releaseDigest: "a".repeat(64),
          environment: "production",
          environmentRevision: 1,
          lastDeploymentId: crypto.randomUUID(),
        },
      })
    );
    const target = {
      releaseVersion: "v2.1.7",
      releaseDigest: "a".repeat(64),
      environment: "production" as const,
      environmentRevision: 1,
    };

    expect(isSameDeploymentCombination(current, target)).toBe(true);
    expect(
      isSameDeploymentCombination(current, {
        ...target,
        releaseDigest: "b".repeat(64),
      })
    ).toBe(false);
    expect(
      isSameDeploymentCombination(current, {
        ...target,
        environment: "staging",
      })
    ).toBe(false);
    expect(
      isSameDeploymentCombination(current, {
        ...target,
        environmentRevision: 2,
      })
    ).toBe(false);
  });

  it("非法或不完整设备上报不阻断修复部署", () => {
    const target = {
      releaseVersion: "v2.1.7",
      releaseDigest: "a".repeat(64),
      environment: "production" as const,
      environmentRevision: 1,
    };

    expect(
      isSameDeploymentCombination(parseReportedDeployment("not-json"), target)
    ).toBe(false);
    expect(
      isSameDeploymentCombination(
        parseReportedDeployment(
          JSON.stringify({
            deployment: {
              releaseVersion: target.releaseVersion,
              environment: target.environment,
              environmentRevision: target.environmentRevision,
            },
          })
        ),
        target
      )
    ).toBe(false);
  });

  it("apply 在写审计和下发命令前拒绝设备当前组合", async () => {
    vi.spyOn(clientDeploymentRepository, "getDevice").mockResolvedValue({
      isEnabled: true,
      reportedExtraJson,
    });
    vi.spyOn(
      clientDeploymentRepository,
      "getReleaseByVersion"
    ).mockResolvedValue(release);
    vi.spyOn(
      clientDeploymentRepository,
      "ensureEnvironments"
    ).mockResolvedValue();
    vi.spyOn(
      clientDeploymentRepository,
      "getActiveEnvironmentRevision"
    ).mockResolvedValue(environment);
    const addDeployment = vi.spyOn(clientDeploymentRepository, "addDeployment");

    await expect(
      clientDeploymentService.apply.service(
        {
          clientId: "phone-001",
          releaseVersion: release.releaseVersion,
          environment: environment.environment.name,
        },
        user,
        context
      )
    ).rejects.toMatchObject({
      meta: { message: "设备已运行目标版本和环境修订" },
    });
    expect(addDeployment).not.toHaveBeenCalled();
  });

  it("rollback 在写审计和下发命令前拒绝设备当前组合", async () => {
    const source = {
      id: 9,
      deploymentId: "11111111-1111-4111-8111-111111111111",
      clientId: "phone-001",
      activeClientId: null,
      releaseId: 8,
      releaseVersion: "v2.1.8",
      releaseDigest: "b".repeat(64),
      environmentRevisionId: 41,
      environment: "staging",
      environmentRevision: 2,
      activationMode: "GRACEFUL",
      drainTimeoutMs: 900_000,
      phase: "SUCCEEDED",
      previousReleaseVersion: release.releaseVersion,
      previousReleaseDigest: release.artifactSha256,
      previousEnvironment: environment.environment.name,
      previousEnvironmentRevision: environment.revision.revision,
      resultCode: null,
      resultMessage: null,
      expiresAtUtc: 2,
      startedAtUtc: 1,
      finishedAtUtc: 2,
      creatorId: 1,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: 2,
    } as const satisfies MobileClientDeployment;
    vi.spyOn(clientDeploymentRepository, "getDeployment").mockResolvedValue(
      source
    );
    vi.spyOn(
      clientDeploymentRepository,
      "getReleaseByVersion"
    ).mockResolvedValue(release);
    vi.spyOn(clientDeploymentRepository, "getEnvironment").mockResolvedValue(
      environment.environment
    );
    vi.spyOn(
      clientDeploymentRepository,
      "getEnvironmentRevision"
    ).mockResolvedValue(environment);
    vi.spyOn(clientDeploymentRepository, "getDevice").mockResolvedValue({
      isEnabled: true,
      reportedExtraJson,
    });
    const addDeployment = vi.spyOn(clientDeploymentRepository, "addDeployment");

    await expect(
      clientDeploymentService.rollback.service(
        { deploymentId: source.deploymentId },
        user,
        context
      )
    ).rejects.toMatchObject({
      meta: { message: "设备已运行回滚目标版本和环境修订" },
    });
    expect(addDeployment).not.toHaveBeenCalled();
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
