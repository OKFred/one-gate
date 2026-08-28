import type { FromSchema } from "json-schema-to-ts";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  bodyAdapter,
  bodyClientInfoAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { UserObj } from "@hodor/core/types/app";
import { HTTPException } from "hono/http-exception";
import { registry } from "../../../../../common/registry.js";
import {
  OAuthError,
  OAuthErrorCode,
  parseAccountIntent,
  parseOAuthProvider,
} from "../../domain/oauth.js";
import { getOAuthCenter } from "../../infrastructure/container.js";
import {
  OAuthAccountCallbackRes,
  OAuthAccountUrlReq,
  OAuthBindingProfileReq,
  OAuthBindingProfileRes,
  OAuthBindingUnbindReq,
  OAuthBindingUnbindRes,
  OAuthCallbackReq,
  OAuthLoginRes,
  OAuthUrlReq,
  OAuthUrlRes,
} from "./model.js";

export function mapOAuthError(error: unknown): never {
  if (!(error instanceof OAuthError)) throw error;
  if (error.code === OAuthErrorCode.ACCOUNT_NOT_BOUND) {
    return throwOAuthHttpError(403, "账号未绑定，请联系管理员", error.code);
  }
  if (error.code === OAuthErrorCode.REVOKE_FAILED) {
    return throwOAuthHttpError(
      502,
      "撤销 GitHub OAuth 授权失败，本地绑定已保留",
      error.code
    );
  }
  if (error.code === OAuthErrorCode.PROVIDER_NOT_CONFIGURED) {
    return throwOAuthHttpError(
      503,
      "OAuth 登录暂不可用，请联系管理员",
      error.code
    );
  }
  if (error.code === OAuthErrorCode.SENSITIVE_DATA_FAILURE) {
    return throwOAuthHttpError(
      503,
      "OAuth 登录暂不可用，请联系管理员",
      error.code
    );
  }
  const invalidCodes = [
    OAuthErrorCode.INVALID_REQUEST,
    OAuthErrorCode.INVALID_STATE,
    OAuthErrorCode.INVALID_REDIRECT_URI,
    OAuthErrorCode.PROVIDER_REJECTED,
  ] as const;
  const permissionCodes = [
    OAuthErrorCode.ELIGIBILITY_REJECTED,
    OAuthErrorCode.ACCOUNT_NOT_BOUND,
    OAuthErrorCode.ACCOUNT_DISABLED,
  ] as const;
  if (invalidCodes.some((value) => value === error.code)) {
    return throwOAuthHttpError(400, error.message, error.code);
  }
  if (permissionCodes.some((value) => value === error.code)) {
    return throwOAuthHttpError(403, error.message, error.code);
  }
  if (error.code === OAuthErrorCode.BINDING_CONFLICT) {
    return throwOAuthHttpError(409, error.message, error.code);
  }
  if (error.code === OAuthErrorCode.BINDING_NOT_FOUND) {
    return throwOAuthHttpError(404, error.message, error.code);
  }
  return throwOAuthHttpError(500, "errorHandler.unknownError", error.code);
}

function throwOAuthHttpError(
  status: 400 | 403 | 404 | 409 | 500 | 502 | 503,
  message: string,
  code: OAuthErrorCode
): never {
  throw new HTTPException(status, {
    message,
    cause: { error: { code } },
  });
}

async function onLoginUrl(params: FromSchema<typeof OAuthUrlReq>) {
  try {
    return await getOAuthCenter().createLoginUrl({
      provider: parseOAuthProvider(params.provider),
      redirectUri: params.redirectUri,
    });
  } catch (error) {
    return mapOAuthError(error);
  }
}

async function onLoginCallback(
  params: FromSchema<typeof OAuthCallbackReq>,
  clientInfo: { ip: string; userAgent: string }
) {
  try {
    const result = await getOAuthCenter().loginCallback(params);
    await registry.maintenance.recordLogin(
      result.userObj.id,
      clientInfo.ip,
      clientInfo.userAgent,
      result.userObj.username
    );
    return result;
  } catch (error) {
    return mapOAuthError(error);
  }
}

async function onAccountUrl(
  params: FromSchema<typeof OAuthAccountUrlReq>,
  userObj: UserObj
) {
  try {
    return await getOAuthCenter().createAccountUrl({
      provider: parseOAuthProvider(params.provider),
      redirectUri: params.redirectUri,
      intent: parseAccountIntent(params.intent),
      userId: userObj.userId,
    });
  } catch (error) {
    return mapOAuthError(error);
  }
}

async function onAccountCallback(
  params: FromSchema<typeof OAuthCallbackReq>,
  userObj: UserObj
) {
  try {
    return await getOAuthCenter().accountCallback({
      ...params,
      userId: userObj.userId,
    });
  } catch (error) {
    return mapOAuthError(error);
  }
}

async function onBindingUnbind(
  params: FromSchema<typeof OAuthBindingUnbindReq>,
  userObj: UserObj
) {
  try {
    return await getOAuthCenter().unbind({
      userId: userObj.userId,
      provider: parseOAuthProvider(params.provider),
      ...(params.redirectUri ? { redirectUri: params.redirectUri } : {}),
    });
  } catch (error) {
    return mapOAuthError(error);
  }
}

async function onBindingProfile(
  params: FromSchema<typeof OAuthBindingProfileReq>,
  userObj: UserObj
) {
  try {
    return await getOAuthCenter().getBindingProfile({
      userId: userObj.userId,
      provider: parseOAuthProvider(params.provider),
    });
  } catch (error) {
    return mapOAuthError(error);
  }
}

const loginUrlApi = {
  req: OAuthUrlReq,
  res: OAuthUrlRes,
  pathInfo: {
    path: "/oauth/login/url",
    method: "post",
    summary: "获取 OAuth 登录地址",
  } as const,
  adapter: bodyAdapter,
  service: onLoginUrl,
  permission: false,
} satisfies API;

const loginCallbackApi = {
  req: OAuthCallbackReq,
  res: OAuthLoginRes,
  pathInfo: {
    path: "/oauth/login/callback",
    method: "post",
    summary: "OAuth 登录回调",
  } as const,
  adapter: bodyClientInfoAdapter,
  service: onLoginCallback,
  permission: false,
} satisfies API;

const accountUrlApi = {
  req: OAuthAccountUrlReq,
  res: OAuthUrlRes,
  pathInfo: {
    path: "/oauth/account/url",
    method: "post",
    summary: "获取 OAuth 账号操作地址",
  } as const,
  adapter: bodyUserAdapter,
  service: onAccountUrl,
  permission: false,
} satisfies API;

const accountCallbackApi = {
  req: OAuthCallbackReq,
  res: OAuthAccountCallbackRes,
  pathInfo: {
    path: "/oauth/account/callback",
    method: "post",
    summary: "OAuth 账号操作回调",
  } as const,
  adapter: bodyUserAdapter,
  service: onAccountCallback,
  permission: false,
} satisfies API;

const bindingUnbindApi = {
  req: OAuthBindingUnbindReq,
  res: OAuthBindingUnbindRes,
  pathInfo: {
    path: "/oauth/binding/unbind",
    method: "post",
    summary: "解绑 OAuth 账号",
  } as const,
  adapter: bodyUserAdapter,
  service: onBindingUnbind,
  permission: false,
} satisfies API;

const bindingProfileApi = {
  req: OAuthBindingProfileReq,
  res: OAuthBindingProfileRes,
  pathInfo: {
    path: "/oauth/binding/profile",
    method: "post",
    summary: "读取 OAuth 加密档案",
  } as const,
  adapter: bodyUserAdapter,
  service: onBindingProfile,
  permission: false,
} satisfies API;

export default {
  oauthLoginUrl: loginUrlApi,
  oauthLoginCallback: loginCallbackApi,
  oauthAccountUrl: accountUrlApi,
  oauthAccountCallback: accountCallbackApi,
  oauthBindingUnbind: bindingUnbindApi,
  oauthBindingProfile: bindingProfileApi,
};
