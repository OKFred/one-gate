import type { API } from "@hodor/core/middleware/encapsulation";
import {
  bodyUserContextAdapter,
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { Context, UserObj } from "@hodor/core/types/app";
import type { FromSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import { registry } from "../../../../../common/registry.js";
import {
  SsoError,
  SsoErrorCode,
  type SsoConnection,
} from "../../domain/sso.js";
import {
  getSsoCenter,
  getSsoConfigurationCenter,
  SsoConfigurationError,
} from "../../infrastructure/container.js";
import { SsoOidcProviderError } from "../../infrastructure/oidc-provider.js";
import {
  SsoBindingSummaryRes,
  SsoCallbackReq,
  SsoConnectionSaveReq,
  SsoConnectionSummaryRes,
  SsoConnectionVersionReq,
  SsoEmptyReq,
  SsoLoginRes,
  SsoMessageRes,
  SsoUrlReq,
  SsoUrlRes,
} from "./model.js";

type CurrentUser = Pick<UserObj, "userId">;
type ConfigurationAdmin = Pick<
  UserObj,
  "userId" | "isSuperAdmin" | "ensureLoaded"
>;

function requestIdFrom(context: Context): string {
  return context.get("requestId");
}

function bodyFrom<T>(context: Context): T {
  return context.get("bodyObj") as T;
}

function clientInfoFrom(context: Context): { ip: string; userAgent: string } {
  return {
    ip:
      context.req.header("x-forwarded-for") ??
      context.req.header("x-real-ip") ??
      "unknown",
    userAgent: context.req.header("user-agent") ?? "unknown",
  };
}

export function mapSsoHttpError(error: unknown): never {
  if (error instanceof SsoConfigurationError) {
    return throwSsoHttpError(
      503,
      "SSO 登录暂不可用，请联系管理员",
      "SSO_CONFIGURATION_ERROR"
    );
  }
  if (error instanceof SsoOidcProviderError) {
    return throwSsoHttpError(
      error.code === "INVALID_CONFIGURATION" ? 503 : 502,
      error.code === "INVALID_CONFIGURATION"
        ? "SSO 登录暂不可用，请联系管理员"
        : "SSO 服务暂时不可用，请稍后重试",
      `SSO_${error.code}`
    );
  }
  if (!(error instanceof SsoError)) throw error;
  if (error.code === SsoErrorCode.ACCOUNT_NOT_BOUND) {
    return throwSsoHttpError(403, "账号未绑定，请联系管理员", error.code);
  }
  if (error.code === SsoErrorCode.SENSITIVE_DATA_FAILURE) {
    return throwSsoHttpError(503, "SSO 登录暂不可用，请联系管理员", error.code);
  }

  const invalidCodes = [
    SsoErrorCode.INVALID_REQUEST,
    SsoErrorCode.INVALID_ISSUER,
    SsoErrorCode.INVALID_REDIRECT_URI,
    SsoErrorCode.INVALID_PKCE,
    SsoErrorCode.INVALID_STATE,
    SsoErrorCode.CONFIGURATION_INVALID,
  ] as const;
  if (invalidCodes.some((value) => value === error.code)) {
    return throwSsoHttpError(400, error.message, error.code);
  }
  if (
    error.code === SsoErrorCode.ACCOUNT_DISABLED ||
    error.code === SsoErrorCode.PRINCIPAL_MISMATCH
  ) {
    return throwSsoHttpError(403, error.message, error.code);
  }
  if (error.code === SsoErrorCode.BINDING_CONFLICT) {
    return throwSsoHttpError(409, error.message, error.code);
  }
  if (error.code === SsoErrorCode.CONFIGURATION_CONFLICT) {
    return throwSsoHttpError(409, error.message, error.code);
  }
  if (error.code === SsoErrorCode.CONFIGURATION_NOT_READY) {
    return throwSsoHttpError(
      503,
      "SSO 登录暂不可用，请联系管理员",
      "SSO_CONFIGURATION_ERROR"
    );
  }
  if (error.code === SsoErrorCode.BINDING_NOT_FOUND) {
    return throwSsoHttpError(404, error.message, error.code);
  }
  return throwSsoHttpError(500, "errorHandler.unknownError", error.code);
}

async function requireConfigurationAdmin(userObj: ConfigurationAdmin) {
  await userObj.ensureLoaded();
  if (!userObj.isSuperAdmin) {
    return throwSsoHttpError(
      403,
      "仅超级管理员可以管理 SSO 配置",
      "SSO_CONFIGURATION_FORBIDDEN"
    );
  }
  return userObj;
}

function toConnectionSummary(
  connection: SsoConnection | null
): FromSchema<typeof SsoConnectionSummaryRes> {
  return connection
    ? {
        configured: true,
        status: connection.status,
        issuer: connection.issuer,
        clientId: connection.clientId,
        audience: connection.audience,
        allowedTenantId: connection.allowedTenantId,
        redirectUris: [...connection.redirectUris],
        configVersion: connection.configVersion,
        lastTestedAtUtc: connection.lastTestedAtUtc,
        updateTimeUtc: connection.updateTimeUtc,
      }
    : {
        configured: false,
        status: null,
        issuer: null,
        clientId: null,
        audience: null,
        allowedTenantId: null,
        redirectUris: [],
        configVersion: 0,
        lastTestedAtUtc: null,
        updateTimeUtc: null,
      };
}

export async function onSsoConfigurationGet(
  _params: FromSchema<typeof SsoEmptyReq>,
  userObj: ConfigurationAdmin,
  _context: Context
): Promise<FromSchema<typeof SsoConnectionSummaryRes>> {
  try {
    await requireConfigurationAdmin(userObj);
    return toConnectionSummary(await getSsoConfigurationCenter().get());
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoConfigurationSave(
  params: FromSchema<typeof SsoConnectionSaveReq>,
  userObj: ConfigurationAdmin,
  _context: Context
): Promise<FromSchema<typeof SsoConnectionSummaryRes>> {
  try {
    const admin = await requireConfigurationAdmin(userObj);
    const connection = await getSsoConfigurationCenter().saveDraft({
      values: {
        issuer: params.issuer,
        clientId: params.clientId,
        audience: params.audience,
        allowedTenantId: params.allowedTenantId,
        redirectUris: params.redirectUris,
      },
      expectedVersion: params.expectedVersion,
      updatedByUserId: admin.userId,
    });
    return toConnectionSummary(connection);
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoConfigurationTest(
  params: FromSchema<typeof SsoConnectionVersionReq>,
  userObj: ConfigurationAdmin,
  context: Context
): Promise<FromSchema<typeof SsoConnectionSummaryRes>> {
  try {
    const admin = await requireConfigurationAdmin(userObj);
    const connection = await getSsoConfigurationCenter().test({
      expectedVersion: params.expectedVersion,
      updatedByUserId: admin.userId,
      requestId: requestIdFrom(context),
    });
    return toConnectionSummary(connection);
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoConfigurationDisable(
  params: FromSchema<typeof SsoConnectionVersionReq>,
  userObj: ConfigurationAdmin,
  _context: Context
): Promise<FromSchema<typeof SsoConnectionSummaryRes>> {
  try {
    const admin = await requireConfigurationAdmin(userObj);
    const connection = await getSsoConfigurationCenter().disable({
      expectedVersion: params.expectedVersion,
      updatedByUserId: admin.userId,
    });
    return toConnectionSummary(connection);
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

function throwSsoHttpError(
  status: 400 | 403 | 404 | 409 | 500 | 502 | 503,
  message: string,
  code: string
): never {
  throw new HTTPException(status, {
    message,
    cause: { error: { code } },
  });
}

export async function onSsoLoginUrl(
  params: FromSchema<typeof SsoUrlReq>,
  context: Context
) {
  try {
    return await getSsoCenter().createLoginUrl({
      redirectUri: params.redirectUri,
      requestId: requestIdFrom(context),
    });
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoLoginCallback(
  params: FromSchema<typeof SsoCallbackReq>,
  context: Context
) {
  try {
    const result = await getSsoCenter().loginCallback({
      ...params,
      requestId: requestIdFrom(context),
    });
    const clientInfo = clientInfoFrom(context);
    await registry.maintenance.recordLogin(
      result.userObj.id,
      clientInfo.ip,
      clientInfo.userAgent,
      result.userObj.username
    );
    return result;
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoAccountUrl(
  params: FromSchema<typeof SsoUrlReq>,
  userObj: CurrentUser,
  context: Context
) {
  try {
    return await getSsoCenter().createBindUrl({
      redirectUri: params.redirectUri,
      userId: userObj.userId,
      requestId: requestIdFrom(context),
    });
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoAccountCallback(
  params: FromSchema<typeof SsoCallbackReq>,
  userObj: CurrentUser,
  context: Context
): Promise<FromSchema<typeof SsoMessageRes>> {
  try {
    const result = await getSsoCenter().bindCallback({
      ...params,
      userId: userObj.userId,
      requestId: requestIdFrom(context),
    });
    return { message: result.message };
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoBindingUnbind(
  _params: FromSchema<typeof SsoEmptyReq>,
  userObj: CurrentUser,
  _context: Context
) {
  try {
    return await getSsoCenter().unbind({ userId: userObj.userId });
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

export async function onSsoBindingSummary(
  _params: FromSchema<typeof SsoEmptyReq>,
  userObj: CurrentUser,
  _context: Context
): Promise<FromSchema<typeof SsoBindingSummaryRes>> {
  try {
    const binding = await getSsoCenter().getBindingSummary(userObj.userId);
    return binding
      ? {
          bound: true,
          issuer: binding.issuer,
          tenantId: binding.tenantId,
          membershipId: binding.membershipId,
          clientId: binding.clientId,
          amr: [...binding.amr],
          scope: [...binding.scope],
          createTimeUtc: binding.createTimeUtc,
          updateTimeUtc: binding.updateTimeUtc,
        }
      : {
          bound: false,
          issuer: null,
          tenantId: null,
          membershipId: null,
          clientId: null,
          amr: [],
          scope: [],
          createTimeUtc: null,
          updateTimeUtc: null,
        };
  } catch (error) {
    return mapSsoHttpError(error);
  }
}

const loginUrlApi = {
  req: SsoUrlReq,
  res: SsoUrlRes,
  pathInfo: {
    path: "/sso/login/url",
    method: "post",
    summary: "获取 SSO 登录地址",
  } as const,
  adapter: rawAdapter,
  service: (context: Context) => onSsoLoginUrl(bodyFrom(context), context),
  permission: false,
} satisfies API;

const loginCallbackApi = {
  req: SsoCallbackReq,
  res: SsoLoginRes,
  pathInfo: {
    path: "/sso/login/callback",
    method: "post",
    summary: "SSO 登录回调",
  } as const,
  adapter: rawAdapter,
  service: (context: Context) => onSsoLoginCallback(bodyFrom(context), context),
  permission: false,
} satisfies API;

const accountUrlApi = {
  req: SsoUrlReq,
  res: SsoUrlRes,
  pathInfo: {
    path: "/sso/account/url",
    method: "post",
    summary: "获取 SSO 绑定地址",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoAccountUrl,
  permission: false,
} satisfies API;

const accountCallbackApi = {
  req: SsoCallbackReq,
  res: SsoMessageRes,
  pathInfo: {
    path: "/sso/account/callback",
    method: "post",
    summary: "SSO 账号绑定回调",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoAccountCallback,
  permission: false,
} satisfies API;

const bindingUnbindApi = {
  req: SsoEmptyReq,
  res: SsoMessageRes,
  pathInfo: {
    path: "/sso/binding/unbind",
    method: "post",
    summary: "解绑 SSO 账号",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoBindingUnbind,
  permission: false,
} satisfies API;

const bindingSummaryApi = {
  req: SsoEmptyReq,
  res: SsoBindingSummaryRes,
  pathInfo: {
    path: "/sso/binding/summary",
    method: "post",
    summary: "读取 SSO 绑定摘要",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoBindingSummary,
  permission: false,
} satisfies API;

const configurationGetApi = {
  req: SsoEmptyReq,
  res: SsoConnectionSummaryRes,
  pathInfo: {
    path: "/sso/config/get",
    method: "post",
    summary: "读取 SSO 连接配置",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoConfigurationGet,
  permission: false,
} satisfies API;

const configurationSaveApi = {
  req: SsoConnectionSaveReq,
  res: SsoConnectionSummaryRes,
  pathInfo: {
    path: "/sso/config/save",
    method: "post",
    summary: "保存 SSO 连接草稿",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoConfigurationSave,
  permission: false,
} satisfies API;

const configurationTestApi = {
  req: SsoConnectionVersionReq,
  res: SsoConnectionSummaryRes,
  pathInfo: {
    path: "/sso/config/test",
    method: "post",
    summary: "测试并启用 SSO 连接",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoConfigurationTest,
  permission: false,
} satisfies API;

const configurationDisableApi = {
  req: SsoConnectionVersionReq,
  res: SsoConnectionSummaryRes,
  pathInfo: {
    path: "/sso/config/disable",
    method: "post",
    summary: "停用 SSO 连接",
  } as const,
  adapter: bodyUserContextAdapter,
  service: onSsoConfigurationDisable,
  permission: false,
} satisfies API;

export default {
  ssoLoginUrl: loginUrlApi,
  ssoLoginCallback: loginCallbackApi,
  ssoAccountUrl: accountUrlApi,
  ssoAccountCallback: accountCallbackApi,
  ssoBindingUnbind: bindingUnbindApi,
  ssoBindingSummary: bindingSummaryApi,
  ssoConfigurationGet: configurationGetApi,
  ssoConfigurationSave: configurationSaveApi,
  ssoConfigurationTest: configurationTestApi,
  ssoConfigurationDisable: configurationDisableApi,
};
