import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserContextAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { UserObj } from "@hodor/core/types/app";
import type { FromSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { AuthorizationCenter } from "../../application/authorization-center.js";
import type { AuthorizationConnection } from "../../domain/authorization.js";
import {
  HodorAuthorizationError,
  HodorAuthorizationErrorCode,
} from "../../domain/authorization.js";
import { getAuthorizationCenter } from "../../infrastructure/container.js";
import {
  AuthorizationConnectionSaveReq,
  AuthorizationConnectionSummaryRes,
  AuthorizationConnectionVersionReq,
  AuthorizationEmptyReq,
  AuthorizationPilotDecisionReq,
  AuthorizationPilotDecisionRes,
} from "./model.js";

type ConfigurationAdmin = Pick<
  UserObj,
  "ensureLoaded" | "isSuperAdmin" | "roleIds" | "userId"
>;

type GetConnectionCenter = Pick<AuthorizationCenter, "getConnection">;
type SaveConnectionCenter = Pick<AuthorizationCenter, "saveDraft">;
type TestConnectionCenter = Pick<AuthorizationCenter, "testConnection">;
type DisableConnectionCenter = Pick<AuthorizationCenter, "disableConnection">;
type PilotDecisionCenter = Pick<AuthorizationCenter, "checkPilotDecision">;
const MAX_PILOT_REQUEST_BYTES = 64 * 1024;

export interface AuthorizationRequestContext {
  get(key: "requestId"): string;
}

function requestIdFrom(context: AuthorizationRequestContext): string {
  return context.get("requestId");
}

function ensurePilotRequestSize(
  params: FromSchema<typeof AuthorizationPilotDecisionReq>
): void {
  if (
    new TextEncoder().encode(JSON.stringify(params)).byteLength >
    MAX_PILOT_REQUEST_BYTES
  ) {
    throw new HodorAuthorizationError(
      HodorAuthorizationErrorCode.CONFIGURATION_INVALID,
      "Authorization 决策请求超过 64 KiB 限制"
    );
  }
}

function throwAuthorizationHttpError(
  status: 400 | 403 | 409 | 500 | 502 | 503,
  message: string,
  code: string
): never {
  throw new HTTPException(status, {
    message,
    cause: { error: { code } },
  });
}

export function mapAuthorizationHttpError(error: unknown): never {
  if (!(error instanceof HodorAuthorizationError)) throw error;
  if (error.code === HodorAuthorizationErrorCode.CONFIGURATION_INVALID) {
    return throwAuthorizationHttpError(400, error.message, error.code);
  }
  if (error.code === HodorAuthorizationErrorCode.CONFIGURATION_CONFLICT) {
    return throwAuthorizationHttpError(409, error.message, error.code);
  }
  if (
    error.code === HodorAuthorizationErrorCode.CONFIGURATION_NOT_READY ||
    error.code === HodorAuthorizationErrorCode.CREDENTIAL_FAILURE ||
    error.code === HodorAuthorizationErrorCode.UPSTREAM_INVALID_RESPONSE ||
    error.code === HodorAuthorizationErrorCode.UPSTREAM_UNAVAILABLE
  ) {
    return throwAuthorizationHttpError(
      503,
      "Authorization 服务暂不可用",
      error.code
    );
  }
  if (error.code === HodorAuthorizationErrorCode.UPSTREAM_REJECTED) {
    return throwAuthorizationHttpError(
      502,
      "Authorization 上游拒绝了请求",
      error.code
    );
  }
  return throwAuthorizationHttpError(
    500,
    "errorHandler.unknownError",
    error.code
  );
}

async function requireConfigurationAdmin(
  user: ConfigurationAdmin
): Promise<ConfigurationAdmin> {
  await user.ensureLoaded();
  if (!user.isSuperAdmin) {
    return throwAuthorizationHttpError(
      403,
      "仅超级管理员可以管理 Authorization 配置",
      "AUTHORIZATION_CONFIGURATION_FORBIDDEN"
    );
  }
  return user;
}

export function toAuthorizationConnectionSummary(
  connection: AuthorizationConnection | null
): FromSchema<typeof AuthorizationConnectionSummaryRes> {
  return connection === null
    ? {
        configured: false,
        status: null,
        issuer: null,
        authorizationBaseUrl: null,
        audience: null,
        clientId: null,
        hasClientSecret: false,
        cloudflareAccessClientId: null,
        hasCloudflareAccessClientSecret: false,
        usesCloudflareAccess: false,
        configVersion: 0,
        lastTestedAtUtc: null,
        updateTimeUtc: null,
      }
    : {
        configured: true,
        status: connection.status,
        issuer: connection.issuer,
        authorizationBaseUrl: connection.authorizationBaseUrl,
        audience: connection.audience,
        clientId: connection.clientId,
        hasClientSecret: connection.encryptedClientSecret.length > 0,
        cloudflareAccessClientId: connection.cloudflareAccessClientId,
        hasCloudflareAccessClientSecret:
          connection.encryptedCloudflareAccessClientSecret !== null,
        usesCloudflareAccess:
          connection.cloudflareAccessClientId !== null &&
          connection.encryptedCloudflareAccessClientSecret !== null,
        configVersion: connection.configVersion,
        lastTestedAtUtc: connection.lastTestedAtUtc,
        updateTimeUtc: connection.updateTimeUtc,
      };
}

export async function onAuthorizationConfigurationGet(
  _params: FromSchema<typeof AuthorizationEmptyReq>,
  user: ConfigurationAdmin,
  _context: AuthorizationRequestContext,
  center: GetConnectionCenter = getAuthorizationCenter()
): Promise<FromSchema<typeof AuthorizationConnectionSummaryRes>> {
  try {
    await requireConfigurationAdmin(user);
    return toAuthorizationConnectionSummary(await center.getConnection());
  } catch (error) {
    return mapAuthorizationHttpError(error);
  }
}

export async function onAuthorizationConfigurationSave(
  params: FromSchema<typeof AuthorizationConnectionSaveReq>,
  user: ConfigurationAdmin,
  _context: AuthorizationRequestContext,
  center: SaveConnectionCenter = getAuthorizationCenter()
): Promise<FromSchema<typeof AuthorizationConnectionSummaryRes>> {
  try {
    const admin = await requireConfigurationAdmin(user);
    const connection = await center.saveDraft({
      values: {
        issuer: params.issuer,
        authorizationBaseUrl: params.authorizationBaseUrl,
        audience: params.audience,
        clientId: params.clientId,
        cloudflareAccessClientId: params.cloudflareAccess?.clientId ?? null,
      },
      ...(params.clientSecret === undefined
        ? {}
        : { clientSecret: params.clientSecret }),
      ...(params.cloudflareAccess?.clientSecret === undefined
        ? {}
        : {
            cloudflareAccessClientSecret: params.cloudflareAccess.clientSecret,
          }),
      expectedVersion: params.expectedVersion,
      updatedByUserId: admin.userId,
    });
    return toAuthorizationConnectionSummary(connection);
  } catch (error) {
    return mapAuthorizationHttpError(error);
  }
}

export async function onAuthorizationConfigurationTest(
  params: FromSchema<typeof AuthorizationConnectionVersionReq>,
  user: ConfigurationAdmin,
  context: AuthorizationRequestContext,
  center: TestConnectionCenter = getAuthorizationCenter()
): Promise<FromSchema<typeof AuthorizationConnectionSummaryRes>> {
  try {
    const admin = await requireConfigurationAdmin(user);
    const connection = await center.testConnection({
      expectedVersion: params.expectedVersion,
      updatedByUserId: admin.userId,
      requestId: requestIdFrom(context),
    });
    return toAuthorizationConnectionSummary(connection);
  } catch (error) {
    return mapAuthorizationHttpError(error);
  }
}

export async function onAuthorizationConfigurationDisable(
  params: FromSchema<typeof AuthorizationConnectionVersionReq>,
  user: ConfigurationAdmin,
  _context: AuthorizationRequestContext,
  center: DisableConnectionCenter = getAuthorizationCenter()
): Promise<FromSchema<typeof AuthorizationConnectionSummaryRes>> {
  try {
    const admin = await requireConfigurationAdmin(user);
    const connection = await center.disableConnection({
      expectedVersion: params.expectedVersion,
      updatedByUserId: admin.userId,
    });
    return toAuthorizationConnectionSummary(connection);
  } catch (error) {
    return mapAuthorizationHttpError(error);
  }
}

export async function onAuthorizationPilotCheck(
  params: FromSchema<typeof AuthorizationPilotDecisionReq>,
  user: ConfigurationAdmin,
  context: AuthorizationRequestContext,
  center: PilotDecisionCenter = getAuthorizationCenter()
): Promise<FromSchema<typeof AuthorizationPilotDecisionRes>> {
  try {
    const admin = await requireConfigurationAdmin(user);
    ensurePilotRequestSize(params);
    const result = await center.checkPilotDecision({
      requestId: requestIdFrom(context),
      actor: {
        userId: admin.userId,
        roleIds: admin.roleIds,
        isSuperAdmin: admin.isSuperAdmin,
      },
      decision: {
        action: params.action,
        resource: {
          type: params.resource.type,
          id: params.resource.id,
          attributes: params.resource.attributes,
        },
        context: params.context ?? {},
      },
    });
    return {
      ...result.data,
      authorizationRequestId: result.requestId,
    };
  } catch (error) {
    return mapAuthorizationHttpError(error);
  }
}

const configurationGetApi = {
  req: AuthorizationEmptyReq,
  res: AuthorizationConnectionSummaryRes,
  pathInfo: {
    path: "/config/get",
    method: "post",
    summary: "读取 Authorization 连接配置",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onAuthorizationConfigurationGet,
  permission: false,
} satisfies API;

const configurationSaveApi = {
  req: AuthorizationConnectionSaveReq,
  res: AuthorizationConnectionSummaryRes,
  pathInfo: {
    path: "/config/save",
    method: "post",
    summary: "保存 Authorization 连接草稿",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onAuthorizationConfigurationSave,
  permission: false,
} satisfies API;

const configurationTestApi = {
  req: AuthorizationConnectionVersionReq,
  res: AuthorizationConnectionSummaryRes,
  pathInfo: {
    path: "/config/test",
    method: "post",
    summary: "探测并启用 Authorization 连接",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onAuthorizationConfigurationTest,
  permission: false,
} satisfies API;

const configurationDisableApi = {
  req: AuthorizationConnectionVersionReq,
  res: AuthorizationConnectionSummaryRes,
  pathInfo: {
    path: "/config/disable",
    method: "post",
    summary: "停用 Authorization 连接",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onAuthorizationConfigurationDisable,
  permission: false,
} satisfies API;

const pilotCheckApi = {
  req: AuthorizationPilotDecisionReq,
  res: AuthorizationPilotDecisionRes,
  pathInfo: {
    path: "/pilot/check",
    method: "post",
    summary: "执行服务主体 ABAC 试决策",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onAuthorizationPilotCheck,
  permission: false,
} satisfies API;

export default {
  configurationGet: configurationGetApi,
  configurationSave: configurationSaveApi,
  configurationTest: configurationTestApi,
  configurationDisable: configurationDisableApi,
  pilotCheck: pilotCheckApi,
} satisfies Record<string, API>;
