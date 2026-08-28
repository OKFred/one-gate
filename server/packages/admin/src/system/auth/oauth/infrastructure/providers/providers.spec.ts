import { beforeEach, describe, expect, it, vi } from "vitest";
import { setEnv } from "@hodor/core/utils/env";
import { OAuthErrorCode } from "../../domain/oauth.js";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  json: vi.fn(),
}));

vi.mock("../../../../../common/registry.js", () => ({
  registry: {
    base: {
      httpFetch: {
        fetch: mocks.fetch,
        json: mocks.json,
      },
    },
  },
}));

import { GithubOAuthProvider } from "./github.js";
import { FeishuOAuthProvider } from "./feishu.js";

describe("OAuth provider adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({
      GH_CLIENT_ID: "github-client",
      GH_CLIENT_SECRET: "github-secret",
      GH_ORG_NAME: "OKFred",
      FEISHU_APP_ID: "cli_test",
      FEISHU_APP_SECRET: "feishu-secret",
      FEISHU_ALLOWED_TENANT_KEYS: "tenant-1",
    });
  });

  it("GitHub 远端撤权只有 204 才算成功", async () => {
    const provider = new GithubOAuthProvider();
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(provider.revokeGrant("token")).rejects.toMatchObject({
      code: OAuthErrorCode.REVOKE_FAILED,
    });
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(provider.revokeGrant("token")).resolves.toBeUndefined();
    expect(mocks.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/applications/github-client/grant"),
      expect.objectContaining({
        method: "DELETE",
        auditMode: "metadata-only",
        auditProvider: "github",
      })
    );
  });

  it("GitHub 通过 active 组织成员列表校验登录资格", async () => {
    mocks.json
      .mockResolvedValueOnce({
        access_token: "github-token",
        scope: "user:email,read:org",
      })
      .mockResolvedValueOnce({ id: 1, login: "octocat" });
    mocks.fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { state: "active", organization: { login: "OKFred" } },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      new GithubOAuthProvider().exchangeAndVerify({
        code: "code",
        redirectUri: "http://localhost:5173/oauth/callback",
        intent: "login",
      })
    ).resolves.toMatchObject({
      providerId: "1",
      providerTenantId: "OKFred",
      providerUsername: "octocat",
    });
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/user/memberships/orgs",
      }),
      expect.objectContaining({
        auditMode: "metadata-only",
        auditProvider: "github",
      })
    );
  });

  it("GitHub 组织成员列表被拒绝时返回资格拒绝", async () => {
    mocks.json
      .mockResolvedValueOnce({ access_token: "github-token" })
      .mockResolvedValueOnce({ id: 1, login: "octocat" });
    mocks.fetch.mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(
      new GithubOAuthProvider().exchangeAndVerify({
        code: "code",
        redirectUri: "http://localhost:5173/oauth/callback",
        intent: "login",
      })
    ).rejects.toMatchObject({ code: OAuthErrorCode.ELIGIBILITY_REJECTED });
  });

  it("飞书授权 URL 请求完整档案所需的最小用户权限", () => {
    const url = new URL(
      new FeishuOAuthProvider().getAuthorizationUrl({
        state: "state",
        redirectUri: "http://localhost:5173/oauth/callback",
      })
    );
    expect(url.searchParams.get("client_id")).toBe("cli_test");
    expect(url.searchParams.has("app_id")).toBe(false);
    expect(new Set(url.searchParams.get("scope")?.split(" "))).toEqual(
      new Set([
        "contact:contact.base:readonly",
        "contact:user.base:readonly",
        "contact:user.department:readonly",
        "contact:user.email:readonly",
        "contact:user.employee:readonly",
        "contact:user.employee_id:readonly",
        "contact:user.employee_number:read",
        "contact:user.phone:readonly",
      ])
    );
  });

  it("飞书以 open_id 为绑定身份并校验租户和成员状态", async () => {
    mocks.json
      .mockResolvedValueOnce({
        code: 0,
        access_token: "user-token",
        scope: "contact:user.base:readonly",
      })
      .mockResolvedValueOnce({
        code: 0,
        data: {
          open_id: "ou_1",
          user_id: "u_1",
          tenant_key: "tenant-1",
          name: "测试成员",
        },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: {
          user: {
            open_id: "ou_1",
            name: "测试成员",
            status: {
              is_activated: true,
              is_frozen: false,
              is_resigned: false,
              is_unjoin: false,
            },
          },
        },
      });
    const identity = await new FeishuOAuthProvider().exchangeAndVerify({
      code: "code",
      redirectUri: "http://localhost:5173/oauth/callback",
      intent: "login",
    });
    expect(identity).toMatchObject({
      providerId: "ou_1",
      providerTenantId: "tenant-1",
      providerUsername: "测试成员",
    });
    expect(mocks.json).toHaveBeenLastCalledWith(
      expect.stringContaining("/contact/v3/users/ou_1?user_id_type=open_id"),
      expect.objectContaining({
        auditMode: "metadata-only",
        auditProvider: "feishu",
      })
    );
  });

  it("飞书拒绝非允许租户和冻结成员", async () => {
    mocks.json
      .mockResolvedValueOnce({ code: 0, access_token: "user-token" })
      .mockResolvedValueOnce({
        code: 0,
        data: { open_id: "ou_2", tenant_key: "other-tenant" },
      });
    await expect(
      new FeishuOAuthProvider().exchangeAndVerify({
        code: "code",
        redirectUri: "http://localhost:5173/oauth/callback",
        intent: "login",
      })
    ).rejects.toMatchObject({ code: OAuthErrorCode.ELIGIBILITY_REJECTED });

    vi.clearAllMocks();
    mocks.json
      .mockResolvedValueOnce({ code: 0, access_token: "user-token" })
      .mockResolvedValueOnce({
        code: 0,
        data: { open_id: "ou_2", tenant_key: "tenant-1" },
      })
      .mockResolvedValueOnce({
        code: 0,
        data: {
          user: {
            status: { is_activated: true, is_frozen: true },
          },
        },
      });
    await expect(
      new FeishuOAuthProvider().exchangeAndVerify({
        code: "code",
        redirectUri: "http://localhost:5173/oauth/callback",
        intent: "login",
      })
    ).rejects.toMatchObject({ code: OAuthErrorCode.ELIGIBILITY_REJECTED });
  });
});
