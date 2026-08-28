import type { API } from "@hodor/core/middleware/encapsulation";
import {
  bodyUserContextAdapter,
  rawAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { Context, UserObj } from "@hodor/core/types/app";
import type { FromSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import { registry } from "../../../../../common/registry.js";
import { SsoError, SsoErrorCode } from "../../domain/sso.js";
import {
  getSsoCenter,
  SsoConfigurationError,
} from "../../infrastructure/container.js";
import { SsoOidcProviderError } from "../../infrastructure/oidc-provider.js";
import {
  SsoBindingSummaryRes,
  SsoCallbackReq,
  SsoEmptyReq,
  SsoLoginRes,
  SsoMessageRes,
  SsoUrlReq,
  SsoUrlRes,
} from "./model.js";

type CurrentUser = Pick<UserObj, "userId">;

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
  if (error.code === SsoErrorCode.BINDING_NOT_FOUND) {
    return throwSsoHttpError(404, error.message, error.code);
  }
  return throwSsoHttpError(500, "errorHandler.unknownError", error.code);
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

export default {
  ssoLoginUrl: loginUrlApi,
  ssoLoginCallback: loginCallbackApi,
  ssoAccountUrl: accountUrlApi,
  ssoAccountCallback: accountCallbackApi,
  ssoBindingUnbind: bindingUnbindApi,
  ssoBindingSummary: bindingSummaryApi,
};
