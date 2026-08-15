import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import {
  bodyAdapter,
  bodyUserContextAdapter,
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import { listReqBase } from "@hodor/core/middleware/encapsulation/common.schema";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import type { Context, UserObj } from "@hodor/core/types/app";
import { getEnv } from "@hodor/core/utils/env";
import type { StorageObjectMetadata } from "@hodor/core/utils/storage/types";
import {
  getStorageByConfigKey,
  getStorageConfigByKey,
} from "../../oss/file/service.js";
import mqttService from "../../mqtt/service.js";
import {
  CLIENT_DEPLOYMENT_ACTIVATION_MODES,
  CLIENT_ENVIRONMENT_NAMES,
  assertEnvironmentConfig,
  assertReleaseVersion,
  normalizeRequiredSecretKeys,
  type ClientDeploymentActivationMode,
  type ClientEnvironmentName,
  type DeviceDeploymentCommand,
} from "./domain/deployment.js";
import {
  ClientDeploymentVO,
  ClientEnvironmentVO,
  ClientReleaseVO,
  type MobileClientDeployment,
  type MobileClientRelease,
} from "./model.js";
import {
  clientDeploymentRepository,
  type EnvironmentRevisionView,
} from "./repository.js";

const SHA256_PATTERN = "^[0-9a-f]{64}$";
const releaseVersionSchema = {
  type: "string",
  pattern:
    "^v(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?$",
  maxLength: 100,
} as const satisfies JSONSchema;
const deploymentIdSchema = {
  type: "string",
  minLength: 36,
  maxLength: 36,
} as const satisfies JSONSchema;

/** 客户端发布制品专用 OSS 配置名；禁止回退到默认 OSS。 */
export const MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY = "mobile-client-release";

interface ReleaseUploadTicket {
  releaseVersion: string;
  artifactKey: string;
  artifactSha256: string;
  artifactSize: number;
  manifest: Record<string, unknown>;
  expiresAt: number;
}

/** 抛出统一校验业务错误。 */
function invalid(message: string): never {
  throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, { message });
}

/** 判断配置字段是否为非空文本。 */
function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 返回生成对象存储预签名地址所缺少的配置字段。 */
export function getMissingPresignedStorageFields(config: unknown): string[] {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    return ["provider", "bucket", "accessKey", "secretKey"];
  }
  const storageConfig = config as Record<string, unknown>;
  const missing = ["provider", "bucket", "accessKey", "secretKey"].filter(
    (field) => !hasText(storageConfig[field])
  );
  if (
    hasText(storageConfig.provider) &&
    storageConfig.provider.toUpperCase() === "S3"
  ) {
    ["endpoint", "region"].forEach((field) => {
      if (!hasText(storageConfig[field])) missing.push(field);
    });
  }
  if (
    hasText(storageConfig.provider) &&
    storageConfig.provider.toUpperCase() === "R2" &&
    !hasText(storageConfig.accountId)
  ) {
    missing.push("accountId");
  }
  return missing;
}

/** 从未知异常中读取 AWS 兼容错误码，不暴露原始响应或配置。 */
function getStorageErrorCodes(error: unknown): string[] {
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return [];
  }
  const record = error as Record<string, unknown>;
  return [record.name, record.code, record.Code].filter(hasText);
}

/** 从未知异常中读取 HTTP 状态码。 */
function getStorageErrorHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return undefined;
  }
  const metadata = (error as Record<string, unknown>).$metadata;
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return undefined;
  }
  const status = (metadata as Record<string, unknown>).httpStatusCode;
  return typeof status === "number" ? status : undefined;
}

/** 将对象存储异常收敛为不含端点、密钥和上游响应的安全诊断。 */
export function classifyStorageConnectionError(error: unknown): string {
  const codes = getStorageErrorCodes(error);
  const status = getStorageErrorHttpStatus(error);
  if (
    codes.some((code) =>
      [
        "SignatureDoesNotMatch",
        "AuthorizationHeaderMalformed",
        "InvalidRegion",
      ].includes(code)
    ) ||
    status === 400
  ) {
    return "对象存储连接检查失败: S3 签名或 Region 不匹配";
  }
  if (
    codes.some((code) =>
      [
        "InvalidAccessKeyId",
        "UnrecognizedClientException",
        "AccessDenied",
        "Forbidden",
      ].includes(code)
    ) ||
    status === 401 ||
    status === 403
  ) {
    return "对象存储连接检查失败: S3 Access Key 无效或权限不足";
  }
  if (codes.includes("NoSuchBucket")) {
    return "对象存储连接检查失败: Bucket 不存在";
  }
  if (
    codes.some((code) =>
      [
        "TimeoutError",
        "RequestTimeout",
        "NetworkingError",
        "TypeError",
      ].includes(code)
    )
  ) {
    return "对象存储连接检查失败: Endpoint 不可达或 TLS/网络异常";
  }
  return "对象存储连接检查失败: 请核对 Provider、Endpoint、Region、Bucket 和访问密钥";
}

/**
 * 校验上传制品的 HEAD 元数据。
 *
 * 部分 S3 兼容服务不会在 HEAD 中回传自定义 metadata；这种情况下仍校验
 * 对象存在性、精确大小和 MIME，并依赖签名票据、内容寻址键及客户端摘要校验。
 */
export function getReleaseArtifactMetadataValidationError(
  metadata: StorageObjectMetadata | null,
  expected: { artifactSize: number; artifactSha256: string }
): string | null {
  if (!metadata) return "上传制品不存在";
  if (metadata.size !== expected.artifactSize) {
    return "上传制品大小与票据不一致";
  }
  if (metadata.contentType !== "application/gzip") {
    return "上传制品 MIME 与发布格式不一致";
  }
  const storedSha256 = metadata.customMetadata?.sha256;
  if (storedSha256 !== undefined && storedSha256 !== expected.artifactSha256) {
    return "上传制品摘要元数据与票据不一致";
  }
  return null;
}

/** 将发布数据库行转换为不泄露存储签名的接口模型。 */
function releaseView(row: MobileClientRelease) {
  const { manifestJson, ...release } = row;
  return { ...release, manifest: JSON.parse(manifestJson) as unknown };
}

/** 将部署数据库行收敛为公开响应字段。 */
function deploymentView(row: MobileClientDeployment) {
  return {
    id: row.id,
    deploymentId: row.deploymentId,
    clientId: row.clientId,
    releaseVersion: row.releaseVersion,
    releaseDigest: row.releaseDigest,
    environment: row.environment,
    environmentRevision: row.environmentRevision,
    activationMode: row.activationMode,
    drainTimeoutMs: row.drainTimeoutMs,
    phase: row.phase,
    previousReleaseVersion: row.previousReleaseVersion,
    previousReleaseDigest: row.previousReleaseDigest,
    previousEnvironment: row.previousEnvironment,
    previousEnvironmentRevision: row.previousEnvironmentRevision,
    resultCode: row.resultCode,
    resultMessage: row.resultMessage,
    expiresAtUtc: row.expiresAtUtc,
    startedAtUtc: row.startedAtUtc,
    finishedAtUtc: row.finishedAtUtc,
    creatorId: row.creatorId,
    createTimeUtc: row.createTimeUtc,
    updateTimeUtc: row.updateTimeUtc,
  };
}

/** 将环境当前修订转换为接口模型。 */
function environmentView(view: EnvironmentRevisionView) {
  return {
    id: view.environment.id,
    name: view.environment.name,
    isEnabled: view.environment.isEnabled,
    revision: view.revision.revision,
    config: view.config,
    requiredSecretKeys: view.requiredSecretKeys,
    createTimeUtc: view.revision.createTimeUtc,
  };
}

/** 编码不带填充的 URL-safe Base64。 */
function encodeBase64Url(bytes: Uint8Array): string {
  let text = "";
  bytes.forEach((value) => {
    text += String.fromCharCode(value);
  });
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 解码不带填充的 URL-safe Base64。 */
function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  );
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

/** 读取并校验 CI 专用最小权限发布令牌。 */
function requirePublishToken(context: Context): string {
  const expected = String(getEnv("MOBILE_RELEASE_PUBLISH_TOKEN") || "");
  const actual = context.req.header("authorization") || "";
  if (!expected || actual !== `Bearer ${expected}`) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED, {
      message: "客户端发布令牌无效",
    });
  }
  return expected;
}

/** 使用发布令牌签发短期上传票据，避免服务端接收制品内容。 */
async function signUploadTicket(
  ticket: ReleaseUploadTicket,
  secret: string
): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(ticket));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, payload)
  );
  return `${encodeBase64Url(payload)}.${encodeBase64Url(signature)}`;
}

/** 校验并读取 CI 上传票据。 */
async function verifyUploadTicket(
  uploadId: string,
  secret: string
): Promise<ReleaseUploadTicket> {
  const [payloadPart, signaturePart, extra] = uploadId.split(".");
  if (!payloadPart || !signaturePart || extra) invalid("上传票据格式无效");
  const payload = decodeBase64Url(payloadPart);
  const signature = decodeBase64Url(signaturePart);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  if (!(await crypto.subtle.verify("HMAC", key, signature, payload))) {
    invalid("上传票据签名无效");
  }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(payload));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    invalid("上传票据内容无效");
  }
  const ticket = parsed as ReleaseUploadTicket;
  if (ticket.expiresAt < Date.now()) invalid("上传票据已过期");
  return ticket;
}

/** 校验构建清单与 Tag 版本完全一致。 */
function validateManifest(
  releaseVersion: string,
  manifest: Record<string, unknown>
): void {
  assertReleaseVersion(releaseVersion);
  if (
    manifest.formatVersion !== 1 ||
    manifest.releaseVersion !== releaseVersion ||
    manifest.packageVersion !== releaseVersion.slice(1) ||
    manifest.deploymentProtocolVersion !== 1 ||
    typeof manifest.gitCommit !== "string" ||
    !/^[0-9a-f]{40}$/.test(manifest.gitCommit) ||
    typeof manifest.minimumSupervisorVersion !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(manifest.minimumSupervisorVersion) ||
    manifest.entrypoint !== "dist/client.js" ||
    typeof manifest.files !== "object" ||
    manifest.files === null ||
    Array.isArray(manifest.files)
  ) {
    invalid("发布清单与版本或协议约束不一致");
  }
}

const uploadPrepareReq = {
  type: "object",
  properties: {
    releaseVersion: releaseVersionSchema,
    artifactSha256: { type: "string", pattern: SHA256_PATTERN },
    artifactSize: { type: "integer", minimum: 1, maximum: 104857600 },
    manifest: { type: "object", additionalProperties: true },
  },
  required: ["releaseVersion", "artifactSha256", "artifactSize", "manifest"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const uploadPrepareRes = {
  type: "object",
  properties: {
    uploadId: { type: "string" },
    uploadUrl: { type: "string" },
    artifactKey: { type: "string" },
    expiresAt: { type: "number" },
  },
  required: ["uploadId", "uploadUrl", "artifactKey", "expiresAt"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 为 CI 准备不可覆盖的 R2/S3 预签名直传。 */
const uploadPrepareApi = {
  req: uploadPrepareReq,
  res: uploadPrepareRes,
  pathInfo: {
    path: "/upload/prepare",
    method: "post",
    summary: "准备客户端不可变发布上传",
  },
  adapter: rawAdapter,
  service: async (
    context: Context
  ): Promise<FromSchema<typeof uploadPrepareRes>> => {
    const secret = requirePublishToken(context);
    const input = context.get("bodyObj") as FromSchema<typeof uploadPrepareReq>;
    validateManifest(input.releaseVersion, input.manifest);
    if (
      await clientDeploymentRepository.getReleaseByVersion(input.releaseVersion)
    ) {
      invalid("客户端版本已存在且不可覆盖");
    }
    const artifactKey = `mobile-client/releases/${input.releaseVersion}/${input.artifactSha256}.tar.gz`;
    const storageConfig = await getStorageConfigByKey(
      MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY
    );
    const missingStorageFields =
      getMissingPresignedStorageFields(storageConfig);
    if (missingStorageFields.length > 0) {
      invalid(
        `客户端发布对象存储配置缺少预签名字段: ${missingStorageFields.join(", ")}`
      );
    }
    const storage = await getStorageByConfigKey(
      context.env,
      MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY
    );
    const existingArtifact = await storage
      .head(artifactKey)
      .catch((error: unknown) =>
        invalid(classifyStorageConnectionError(error))
      );
    if (existingArtifact) invalid("发布制品路径已存在且不可覆盖");
    const expiresAt = Date.now() + 60 * 60 * 1000;
    const uploadUrl = await storage
      .getPresignedPutUrl(artifactKey, {
        expiresIn: 3600,
        contentType: "application/gzip",
        customMetadata: { sha256: input.artifactSha256 },
      })
      .catch(() => invalid("对象存储预签名失败，请检查访问密钥和 R2/S3 端点"));
    const uploadId = await signUploadTicket(
      {
        releaseVersion: input.releaseVersion,
        artifactKey,
        artifactSha256: input.artifactSha256,
        artifactSize: input.artifactSize,
        manifest: input.manifest,
        expiresAt,
      },
      secret
    );
    return { uploadId, uploadUrl, artifactKey, expiresAt };
  },
  permission: false,
} satisfies API;

const uploadFinalizeReq = {
  type: "object",
  properties: {
    uploadId: { type: "string", minLength: 20, maxLength: 200000 },
    releaseNotes: { type: ["string", "null"], nullable: true, maxLength: 4000 },
  },
  required: ["uploadId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 在对象元数据校验通过后登记不可变发布。 */
const uploadFinalizeApi = {
  req: uploadFinalizeReq,
  res: {
    type: "object",
    properties: ClientReleaseVO,
    required: Object.keys(ClientReleaseVO),
    additionalProperties: false,
  } as const satisfies JSONSchema,
  pathInfo: {
    path: "/upload/finalize",
    method: "post",
    summary: "完成客户端不可变发布",
  },
  adapter: rawAdapter,
  service: async (context: Context) => {
    const secret = requirePublishToken(context);
    const input = context.get("bodyObj") as FromSchema<
      typeof uploadFinalizeReq
    >;
    const ticket = await verifyUploadTicket(input.uploadId, secret);
    if (
      await clientDeploymentRepository.getReleaseByVersion(
        ticket.releaseVersion
      )
    ) {
      invalid("客户端版本已存在且不可覆盖");
    }
    const storage = await getStorageByConfigKey(
      context.env,
      MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY
    );
    const metadata = await storage.head(ticket.artifactKey);
    const metadataError = getReleaseArtifactMetadataValidationError(metadata, {
      artifactSize: ticket.artifactSize,
      artifactSha256: ticket.artifactSha256,
    });
    if (metadataError) invalid(metadataError);
    const release = await clientDeploymentRepository.addRelease({
      releaseVersion: ticket.releaseVersion,
      artifactKey: ticket.artifactKey,
      artifactSha256: ticket.artifactSha256,
      artifactSize: ticket.artifactSize,
      manifestJson: JSON.stringify(ticket.manifest),
      releaseNotes: input.releaseNotes ?? null,
      creatorId: 0,
    });
    return releaseView(release);
  },
  permission: false,
} satisfies API;

const releaseListReq = {
  type: "object",
  properties: { ...listReqBase },
  required: ["pageNo", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const releaseListApi = {
  req: releaseListReq,
  res: {
    type: "object",
    properties: {
      total: { type: "integer" },
      totalPage: { type: "integer" },
      currentPage: { type: "integer" },
      pageNo: { type: "integer" },
      pageSize: { type: "integer" },
      list: {
        type: "array",
        items: {
          type: "object",
          properties: ClientReleaseVO,
          required: Object.keys(ClientReleaseVO),
          additionalProperties: false,
        },
      },
    },
    required: [
      "total",
      "totalPage",
      "currentPage",
      "pageNo",
      "pageSize",
      "list",
    ],
    additionalProperties: false,
  } as const satisfies JSONSchema,
  pathInfo: { path: "/list", method: "post", summary: "分页查询客户端发布" },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof releaseListReq>) => {
    const result = await clientDeploymentRepository.listReleases(params);
    return { ...result, list: result.list.map(releaseView) };
  },
  permission: { action: "read" },
} satisfies API;

const releaseVersionReq = {
  type: "object",
  properties: { releaseVersion: releaseVersionSchema },
  required: ["releaseVersion"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const releaseGetApi = {
  req: releaseVersionReq,
  res: uploadFinalizeApi.res,
  pathInfo: { path: "/get", method: "post", summary: "获取客户端发布详情" },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof releaseVersionReq>) => {
    const release = await clientDeploymentRepository.getReleaseByVersion(
      params.releaseVersion
    );
    if (!release) invalid("客户端版本不存在");
    return releaseView(release);
  },
  permission: { action: "read" },
} satisfies API;
const releaseRevokeApi = {
  req: releaseVersionReq,
  res: { type: "boolean" } as const,
  pathInfo: {
    path: "/revoke",
    method: "post",
    summary: "撤销客户端版本的新部署资格",
  },
  adapter: bodyUserContextAdapter,
  service: async (
    params: FromSchema<typeof releaseVersionReq>,
    user: UserObj
  ): Promise<boolean> => {
    const release = await clientDeploymentRepository.getReleaseByVersion(
      params.releaseVersion
    );
    if (!release) invalid("客户端版本不存在");
    await clientDeploymentRepository.revokeRelease(release.id, user.id);
    return true;
  },
  permission: { action: "dispatch" },
} satisfies API;

const environmentNameSchema = {
  type: "string",
  enum: [...CLIENT_ENVIRONMENT_NAMES],
} as const satisfies JSONSchema;
const environmentListApi = {
  req: { type: "object", properties: {}, additionalProperties: false } as const,
  res: {
    type: "array",
    items: {
      type: "object",
      properties: ClientEnvironmentVO,
      required: Object.keys(ClientEnvironmentVO),
      additionalProperties: false,
    },
  } as const satisfies JSONSchema,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "列出客户端环境当前修订",
  },
  adapter: bodyAdapter,
  service: async () => {
    await clientDeploymentRepository.ensureEnvironments();
    return (await clientDeploymentRepository.listEnvironmentRevisions()).map(
      environmentView
    );
  },
  permission: { action: "read" },
} satisfies API;
const environmentGetReq = {
  type: "object",
  properties: { environment: environmentNameSchema },
  required: ["environment"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const environmentGetApi = {
  req: environmentGetReq,
  res: environmentListApi.res.items,
  pathInfo: { path: "/get", method: "post", summary: "获取客户端环境当前修订" },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof environmentGetReq>) => {
    await clientDeploymentRepository.ensureEnvironments();
    const view = await clientDeploymentRepository.getActiveEnvironmentRevision(
      params.environment as ClientEnvironmentName
    );
    if (!view) invalid("客户端环境不存在");
    return environmentView(view);
  },
  permission: { action: "read" },
} satisfies API;
const environmentUpdateReq = {
  type: "object",
  properties: {
    environment: environmentNameSchema,
    config: { type: "object", additionalProperties: true },
    requiredSecretKeys: {
      type: "array",
      items: { type: "string", maxLength: 100 },
      maxItems: 100,
    },
  },
  required: ["environment", "config", "requiredSecretKeys"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const environmentUpdateApi = {
  req: environmentUpdateReq,
  res: environmentListApi.res.items,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "新建并激活客户端环境修订",
  },
  adapter: bodyUserContextAdapter,
  service: async (
    params: FromSchema<typeof environmentUpdateReq>,
    user: UserObj
  ) => {
    assertEnvironmentConfig(params.config);
    const requiredSecretKeys = normalizeRequiredSecretKeys(
      params.requiredSecretKeys
    );
    return environmentView(
      await clientDeploymentRepository.addEnvironmentRevision({
        name: params.environment as ClientEnvironmentName,
        configJson: JSON.stringify(params.config),
        requiredSecretKeysJson: JSON.stringify(requiredSecretKeys),
        creatorId: user.id,
      })
    );
  },
  permission: { action: "dispatch" },
} satisfies API;

/** 从设备上报中读取上一个健康组合。 */
function previousDeployment(reportedExtraJson: string | null): {
  releaseVersion: string | null;
  releaseDigest: string | null;
  environment: ClientEnvironmentName | null;
  environmentRevision: number | null;
} {
  try {
    const root = JSON.parse(reportedExtraJson || "{}") as {
      deployment?: Record<string, unknown>;
    };
    const value = root.deployment || {};
    const environment = CLIENT_ENVIRONMENT_NAMES.includes(
      value.environment as ClientEnvironmentName
    )
      ? (value.environment as ClientEnvironmentName)
      : null;
    return {
      releaseVersion:
        typeof value.releaseVersion === "string" ? value.releaseVersion : null,
      releaseDigest:
        typeof value.releaseDigest === "string" ? value.releaseDigest : null,
      environment,
      environmentRevision:
        typeof value.environmentRevision === "number"
          ? value.environmentRevision
          : null,
    };
  } catch {
    return {
      releaseVersion: null,
      releaseDigest: null,
      environment: null,
      environmentRevision: null,
    };
  }
}

/** 创建部署记录并通过独立管理主题异步下发。 */
async function createDeployment(
  input: {
    clientId: string;
    release: MobileClientRelease;
    environment: EnvironmentRevisionView;
    activationMode: ClientDeploymentActivationMode;
    drainTimeoutMs: number;
    previous: ReturnType<typeof previousDeployment>;
  },
  user: UserObj,
  context: Context
): Promise<MobileClientDeployment> {
  const now = Date.now();
  const deploymentId = crypto.randomUUID();
  const commandExpiresAt = now + 60 * 60 * 1000;
  const storage = await getStorageByConfigKey(
    context.env,
    MOBILE_CLIENT_RELEASE_STORAGE_CONFIG_KEY
  );
  if (
    await clientDeploymentRepository.getActiveDeploymentByClientId(
      input.clientId
    )
  ) {
    invalid("目标设备已有未终结部署");
  }
  const artifactUrl = await storage.getPresignedGetUrl(
    input.release.artifactKey,
    {
      expiresIn: 3600,
    }
  );
  const deployment = await clientDeploymentRepository.addDeployment({
    deploymentId,
    clientId: input.clientId,
    activeClientId: input.clientId,
    releaseId: input.release.id,
    releaseVersion: input.release.releaseVersion,
    releaseDigest: input.release.artifactSha256,
    environmentRevisionId: input.environment.revision.id,
    environment: input.environment.environment.name,
    environmentRevision: input.environment.revision.revision,
    activationMode: input.activationMode,
    drainTimeoutMs: input.drainTimeoutMs,
    phase: "PENDING",
    previousReleaseVersion: input.previous.releaseVersion,
    previousReleaseDigest: input.previous.releaseDigest,
    previousEnvironment: input.previous.environment,
    previousEnvironmentRevision: input.previous.environmentRevision,
    resultCode: null,
    resultMessage: null,
    expiresAtUtc: now + input.drainTimeoutMs + 15 * 60 * 1000,
    startedAtUtc: null,
    finishedAtUtc: null,
    creatorId: user.id,
  });
  const command: DeviceDeploymentCommand = {
    protocolVersion: 1,
    deploymentId,
    deviceId: input.clientId,
    release: {
      version: input.release.releaseVersion,
      artifactUrl,
      artifactSha256: input.release.artifactSha256,
      artifactSize: input.release.artifactSize,
    },
    environment: {
      name: input.environment.environment.name,
      revision: input.environment.revision.revision,
      config: input.environment.config,
      requiredSecretKeys: input.environment.requiredSecretKeys,
    },
    activationMode: input.activationMode,
    drainTimeoutMs: input.drainTimeoutMs,
    createdAt: now,
    expiresAt: commandExpiresAt,
  };
  try {
    await mqttService.publish.service(
      {
        topic: `autojs6/deploy/v1/devices/${input.clientId}/commands`,
        payload: JSON.stringify(command),
        qos: 1,
        retain: false,
        remark: `AutoJS6 client deployment ${deploymentId}`,
      },
      user
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "MQTT publish failed";
    await clientDeploymentRepository.failDeployment(
      deployment.id,
      "MQTT_PUBLISH_FAILED",
      message
    );
    throw error;
  }
  return deployment;
}

const deploymentApplyReq = {
  type: "object",
  properties: {
    clientId: { type: "string", minLength: 1, maxLength: 100 },
    releaseVersion: releaseVersionSchema,
    environment: environmentNameSchema,
    activationMode: {
      type: "string",
      enum: [...CLIENT_DEPLOYMENT_ACTIVATION_MODES],
      default: "GRACEFUL",
    },
    drainTimeoutMs: {
      type: "integer",
      minimum: 1000,
      maximum: 1800000,
      default: 900000,
    },
    forceConfirmed: { type: "boolean", default: false },
  },
  required: ["clientId", "releaseVersion", "environment"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deploymentRes = {
  type: "object",
  properties: ClientDeploymentVO,
  required: Object.keys(ClientDeploymentVO),
  additionalProperties: false,
} as const satisfies JSONSchema;
const deploymentApplyApi = {
  req: deploymentApplyReq,
  res: deploymentRes,
  pathInfo: {
    path: "/apply",
    method: "post",
    summary: "异步部署客户端版本和环境",
  },
  adapter: bodyUserContextAdapter,
  service: async (
    params: FromSchema<typeof deploymentApplyReq>,
    user: UserObj,
    context: Context
  ) => {
    const device = await clientDeploymentRepository.getDevice(params.clientId);
    if (!device?.isEnabled) invalid("目标设备不存在或已停用");
    const release = await clientDeploymentRepository.getReleaseByVersion(
      params.releaseVersion
    );
    if (!release || release.status !== "PUBLISHED")
      invalid("目标版本不存在或已撤销");
    await clientDeploymentRepository.ensureEnvironments();
    const environment =
      await clientDeploymentRepository.getActiveEnvironmentRevision(
        params.environment as ClientEnvironmentName
      );
    if (!environment?.environment.isEnabled) invalid("目标环境不存在或已停用");
    const activationMode = (params.activationMode ||
      "GRACEFUL") as ClientDeploymentActivationMode;
    if (activationMode === "FORCE" && params.forceConfirmed !== true) {
      invalid("强制切换必须二次确认");
    }
    return deploymentView(
      await createDeployment(
        {
          clientId: params.clientId,
          release,
          environment,
          activationMode,
          drainTimeoutMs: params.drainTimeoutMs || 900000,
          previous: previousDeployment(device.reportedExtraJson),
        },
        user,
        context
      )
    );
  },
  permission: { action: "dispatch" },
} satisfies API;

const deploymentGetReq = {
  type: "object",
  properties: { deploymentId: deploymentIdSchema },
  required: ["deploymentId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deploymentGetApi = {
  req: deploymentGetReq,
  res: deploymentRes,
  pathInfo: { path: "/get", method: "post", summary: "查询客户端部署状态" },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof deploymentGetReq>) => {
    const deployment = await clientDeploymentRepository.getDeployment(
      params.deploymentId
    );
    if (!deployment) invalid("部署记录不存在");
    return deploymentView(deployment);
  },
  permission: { action: "read" },
} satisfies API;
const deploymentListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    clientId: { type: "string", maxLength: 100 },
  },
  required: ["pageNo", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deploymentListApi = {
  req: deploymentListReq,
  res: {
    type: "object",
    properties: {
      total: { type: "integer" },
      totalPage: { type: "integer" },
      currentPage: { type: "integer" },
      pageNo: { type: "integer" },
      pageSize: { type: "integer" },
      list: { type: "array", items: deploymentRes },
    },
    required: [
      "total",
      "totalPage",
      "currentPage",
      "pageNo",
      "pageSize",
      "list",
    ],
    additionalProperties: false,
  } as const satisfies JSONSchema,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "分页查询客户端部署历史",
  },
  adapter: bodyAdapter,
  service: async (params: FromSchema<typeof deploymentListReq>) => {
    const result = await clientDeploymentRepository.listDeployments(params);
    return { ...result, list: result.list.map(deploymentView) };
  },
  permission: { action: "read" },
} satisfies API;
const deploymentRollbackApi = {
  req: {
    type: "object",
    properties: {
      deploymentId: deploymentIdSchema,
      activationMode: {
        type: "string",
        enum: [...CLIENT_DEPLOYMENT_ACTIVATION_MODES],
        default: "GRACEFUL",
      },
      forceConfirmed: { type: "boolean", default: false },
    },
    required: ["deploymentId"],
    additionalProperties: false,
  } as const satisfies JSONSchema,
  res: deploymentRes,
  pathInfo: {
    path: "/rollback",
    method: "post",
    summary: "回滚到部署前健康组合",
  },
  adapter: bodyUserContextAdapter,
  service: async (
    params: {
      deploymentId: string;
      activationMode?: string;
      forceConfirmed?: boolean;
    },
    user: UserObj,
    context: Context
  ) => {
    const source = await clientDeploymentRepository.getDeployment(
      params.deploymentId
    );
    if (
      !source ||
      !source.previousReleaseVersion ||
      !source.previousEnvironment ||
      !source.previousEnvironmentRevision
    ) {
      invalid("部署记录没有可回滚的健康组合");
    }
    const release = await clientDeploymentRepository.getReleaseByVersion(
      source.previousReleaseVersion
    );
    if (!release) invalid("回滚制品记录不存在");
    const environmentRow = await clientDeploymentRepository.getEnvironment(
      source.previousEnvironment
    );
    const environment = environmentRow
      ? await clientDeploymentRepository.getEnvironmentRevision(
          environmentRow.id,
          source.previousEnvironmentRevision
        )
      : undefined;
    if (!environment) invalid("回滚环境修订不存在");
    const activationMode = (params.activationMode ||
      "GRACEFUL") as ClientDeploymentActivationMode;
    if (activationMode === "FORCE" && params.forceConfirmed !== true) {
      invalid("强制回滚必须二次确认");
    }
    const device = await clientDeploymentRepository.getDevice(source.clientId);
    if (!device?.isEnabled) invalid("目标设备不存在或已停用");
    return deploymentView(
      await createDeployment(
        {
          clientId: source.clientId,
          release,
          environment,
          activationMode,
          drainTimeoutMs: 900000,
          previous: previousDeployment(device.reportedExtraJson),
        },
        user,
        context
      )
    );
  },
  permission: { action: "dispatch" },
} satisfies API;

export const clientReleaseService = {
  uploadPrepare: uploadPrepareApi,
  uploadFinalize: uploadFinalizeApi,
  list: releaseListApi,
  get: releaseGetApi,
  revoke: releaseRevokeApi,
};
export const clientEnvironmentService = {
  list: environmentListApi,
  get: environmentGetApi,
  update: environmentUpdateApi,
};
export const clientDeploymentService = {
  apply: deploymentApplyApi,
  rollback: deploymentRollbackApi,
  get: deploymentGetApi,
  list: deploymentListApi,
};
