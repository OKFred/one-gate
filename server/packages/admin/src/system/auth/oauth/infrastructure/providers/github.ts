import { getEnv } from "@hodor/core/utils/env";
import { registry } from "../../../../../common/registry.js";
import type { OAuthProviderPort } from "../../application/ports.js";
import { OAuthError, OAuthErrorCode } from "../../domain/oauth.js";
import { asProviderError, splitScopes, toJsonObject } from "./shared.js";

type GithubTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GithubUserResponse = {
  id?: number;
  login?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string;
  company?: string | null;
  location?: string | null;
  html_url?: string;
  site_admin?: boolean;
  [key: string]: unknown;
};

type GithubMembershipResponse = {
  state?: string;
  organization?: { login?: string };
};

function requiredConfig(
  key: "GH_CLIENT_ID" | "GH_CLIENT_SECRET" | "GH_ORG_NAME"
) {
  const value = getEnv(key);
  if (!value) {
    throw new OAuthError(
      OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
      `Missing ${key}`
    );
  }
  return value;
}

function githubHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export class GithubOAuthProvider implements OAuthProviderPort {
  readonly provider = "github" as const;

  getAuthorizationUrl(params: { state: string; redirectUri: string }): string {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", requiredConfig("GH_CLIENT_ID"));
    url.searchParams.set("redirect_uri", params.redirectUri);
    url.searchParams.set("scope", "user:email read:org");
    url.searchParams.set("state", params.state);
    return url.toString();
  }

  async exchangeAndVerify(params: {
    code: string;
    redirectUri: string;
    intent: "login" | "bind" | "unbind";
  }) {
    return asProviderError("GitHub", async () => {
      const clientId = requiredConfig("GH_CLIENT_ID");
      const clientSecret = requiredConfig("GH_CLIENT_SECRET");
      const tokenData = await registry.base.httpFetch.json<GithubTokenResponse>(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: params.code,
            redirect_uri: params.redirectUri,
          }),
          namespace: "system.auth.oauth",
          remark: "GitHub token exchange",
          auditMode: "metadata-only",
          auditProvider: "github",
        }
      );
      if (!tokenData.access_token || tokenData.error) {
        throw new OAuthError(
          OAuthErrorCode.PROVIDER_REJECTED,
          "GitHub 授权码无效或已过期"
        );
      }
      const accessToken = tokenData.access_token;
      const githubUser = await registry.base.httpFetch.json<GithubUserResponse>(
        "https://api.github.com/user",
        {
          headers: githubHeaders(accessToken),
          namespace: "system.auth.oauth",
          remark: "GitHub user profile",
          auditMode: "metadata-only",
          auditProvider: "github",
        }
      );
      if (!githubUser.id || !githubUser.login) {
        throw new OAuthError(
          OAuthErrorCode.PROVIDER_REJECTED,
          "获取 GitHub 用户信息失败"
        );
      }
      if (params.intent !== "unbind") {
        await this.assertActiveOrganizationMembership(accessToken);
      }
      return {
        provider: this.provider,
        providerId: String(githubUser.id),
        providerUsername: githubUser.login,
        providerTenantId: requiredConfig("GH_ORG_NAME"),
        profile: toJsonObject(githubUser),
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

  async revokeGrant(accessToken: string): Promise<void> {
    const clientId = requiredConfig("GH_CLIENT_ID");
    const clientSecret = requiredConfig("GH_CLIENT_SECRET");
    try {
      const response = await registry.base.httpFetch.fetch(
        `https://api.github.com/applications/${encodeURIComponent(clientId)}/grant`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ access_token: accessToken }),
          namespace: "system.auth.oauth",
          remark: "GitHub OAuth grant revoke",
          auditMode: "metadata-only",
          auditProvider: "github",
        }
      );
      if (response.status !== 204) {
        throw new Error(`Unexpected GitHub revoke status ${response.status}`);
      }
    } catch {
      throw new OAuthError(
        OAuthErrorCode.REVOKE_FAILED,
        "撤销 GitHub OAuth 授权失败，本地绑定已保留"
      );
    }
  }

  private async assertActiveOrganizationMembership(
    accessToken: string
  ): Promise<void> {
    const organization = requiredConfig("GH_ORG_NAME");
    const membership =
      await registry.base.httpFetch.json<GithubMembershipResponse>(
        `https://api.github.com/user/memberships/orgs/${encodeURIComponent(
          organization
        )}`,
        {
          headers: githubHeaders(accessToken),
          namespace: "system.auth.oauth",
          remark: "GitHub active organization membership",
          auditMode: "metadata-only",
          auditProvider: "github",
        }
      );
    if (
      membership.state !== "active" ||
      membership.organization?.login?.toLowerCase() !==
        organization.toLowerCase()
    ) {
      throw new OAuthError(
        OAuthErrorCode.ELIGIBILITY_REJECTED,
        `仅允许 ${organization} 组织的 active 成员登录或绑定`
      );
    }
  }
}

export const githubOAuthProvider = new GithubOAuthProvider();
