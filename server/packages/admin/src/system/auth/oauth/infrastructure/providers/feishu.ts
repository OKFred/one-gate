import { getEnv } from "@hodor/core/utils/env";
import { registry } from "../../../../../common/registry.js";
import type { OAuthProviderPort } from "../../application/ports.js";
import {
  isFeishuAccountActive,
  OAuthError,
  OAuthErrorCode,
} from "../../domain/oauth.js";
import { asProviderError, splitScopes, toJsonObject } from "./shared.js";

type FeishuTokenResponse = {
  code?: number;
  message?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type FeishuUserInfoResponse = {
  code?: number;
  msg?: string;
  data?: {
    open_id?: string;
    union_id?: string;
    user_id?: string;
    tenant_key?: string;
    name?: string;
    en_name?: string;
    avatar_url?: string;
    email?: string;
    mobile?: string;
  };
};

type FeishuContactResponse = {
  code?: number;
  msg?: string;
  data?: { user?: object };
};

const FEISHU_OAUTH_SCOPES = [
  "contact:contact.base:readonly",
  "contact:user.base:readonly",
  "contact:user.department:readonly",
  "contact:user.email:readonly",
  "contact:user.employee:readonly",
  "contact:user.employee_id:readonly",
  "contact:user.employee_number:read",
  "contact:user.phone:readonly",
] as const;

function requiredConfig(key: "FEISHU_APP_ID" | "FEISHU_APP_SECRET") {
  const value = getEnv(key);
  if (!value) {
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
      `Missing ${key}`
    );
  }
  return value;
}

function allowedTenantKeys(): string[] {
  const value = getEnv("FEISHU_ALLOWED_TENANT_KEYS");
  const keys = value
    ?.split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
  if (!keys?.length) {
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
      "Missing FEISHU_ALLOWED_TENANT_KEYS"
    );
  }
  return keys;
}

export class FeishuOAuthProvider implements OAuthProviderPort {
  readonly provider = "feishu" as const;

  getAuthorizationUrl(params: { state: string; redirectUri: string }): string {
    const url = new URL(
      "https://accounts.feishu.cn/open-apis/authen/v1/authorize"
    );
    url.searchParams.set("client_id", requiredConfig("FEISHU_APP_ID"));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", FEISHU_OAUTH_SCOPES.join(" "));
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async exchangeAndVerify(params: {
    code: string;
    redirectUri: string;
    intent: "login" | "bind" | "unbind";
  }) {
    return asProviderError("飞书", async () => {
      const tokenData = await registry.base.httpFetch.json<FeishuTokenResponse>(
        "https://open.feishu.cn/open-apis/authen/v2/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: requiredConfig("FEISHU_APP_ID"),
            client_secret: requiredConfig("FEISHU_APP_SECRET"),
            code: params.code,
            redirect_uri: params.redirectUri,
          }),
          namespace: "system.auth.oauth",
          remark: "Feishu token exchange",
          auditMode: "metadata-only",
          auditProvider: "feishu",
        }
      );
      if (tokenData.code !== 0 || !tokenData.access_token) {
        throw new OAuthError(
          OAuthErrorCode.PROVIDER_REJECTED,
          "飞书授权码无效或已过期"
        );
      }
      const accessToken = tokenData.access_token;
      const userInfo =
        await registry.base.httpFetch.json<FeishuUserInfoResponse>(
          "https://open.feishu.cn/open-apis/authen/v1/user_info",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            namespace: "system.auth.oauth",
            remark: "Feishu OAuth user info",
            auditMode: "metadata-only",
            auditProvider: "feishu",
          }
        );
      const identity = userInfo.data;
      if (userInfo.code !== 0 || !identity?.open_id || !identity.tenant_key) {
        throw new OAuthError(
          OAuthErrorCode.PROVIDER_REJECTED,
          "获取飞书用户身份失败"
        );
      }
      if (!allowedTenantKeys().includes(identity.tenant_key)) {
        throw new OAuthError(
          OAuthErrorCode.ELIGIBILITY_REJECTED,
          "当前飞书企业不在允许列表中"
        );
      }
      const contact = await registry.base.httpFetch.json<FeishuContactResponse>(
        `https://open.feishu.cn/open-apis/contact/v3/users/${encodeURIComponent(
          identity.open_id
        )}?user_id_type=open_id&department_id_type=open_department_id`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          namespace: "system.auth.oauth",
          remark: "Feishu contact user profile",
          auditMode: "metadata-only",
          auditProvider: "feishu",
        }
      );
      if (contact.code !== 0 || !contact.data?.user) {
        throw new OAuthError(
          OAuthErrorCode.ELIGIBILITY_REJECTED,
          "飞书用户不在应用可用范围或通讯录不可访问"
        );
      }
      const profile = toJsonObject(contact.data.user);
      if (!isFeishuAccountActive(profile)) {
        throw new OAuthError(
          OAuthErrorCode.ELIGIBILITY_REJECTED,
          "飞书用户已冻结、离职、停用或尚未加入企业"
        );
      }
      return {
        provider: this.provider,
        providerId: identity.open_id,
        providerUsername:
          typeof profile.name === "string"
            ? profile.name
            : (identity.name ?? null),
        providerTenantId: identity.tenant_key,
        profile,
        credentials: {
          accessToken,
          ...(tokenData.refresh_token
            ? { refreshToken: tokenData.refresh_token }
            : {}),
          scopes: splitScopes(tokenData.scope),
          ...(tokenData.expires_in
            ? { expiresAtUtc: Date.now() + tokenData.expires_in * 1000 }
            : {}),
        },
      };
    });
  }

  async revokeGrant(_accessToken: string): Promise<void> {
    throw new OAuthError(
      OAuthErrorCode.INVALID_REQUEST,
      "飞书解绑只删除 Hodor 本地绑定"
    );
  }
}

export const feishuOAuthProvider = new FeishuOAuthProvider();
