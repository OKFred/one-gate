import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Context, PermissionInfo, UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
  toHttpException,
} from "@hodor/core/middleware/errorHandler/businessError";
import { registry as enterprise } from "@hodor/enterprise/common/registry";
import { isHodorAuthBypassed } from "@hodor/core/middleware/authenticationRoutePolicy";
import createPersonalAssetApp from "./index";
import { assetActor, placementInput } from "./asset.contract-tests";

const state = vi.hoisted(() => ({
  actor: undefined as UserObj | undefined,
  conflict: false,
  writes: 0,
}));
vi.mock("@hodor/core/middleware/auth", () => ({
  authMiddleware: async (context: Context) => {
    if (!state.actor)
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    context.set("userObj", state.actor);
  },
}));
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));
vi.mock("./repository", () => ({
  getPlacementRepository: () => ({
    list: async () => new Map(),
    place: async () => {
      state.writes += 1;
      return state.conflict
        ? null
        : { site: "OpenMind", floor: 3, version: 1, updateTimeUtc: 1 };
    },
  }),
}));

function permissions(...codes: string[]): PermissionInfo[] {
  return codes.map((code, index) => ({
    id: index + 1,
    code,
    name: code,
    category: "action",
    resource: null,
    business: null,
    remark: null,
    isEnabled: true,
    creatorId: 101,
    updaterId: null,
    createTimeUtc: 1,
    updateTimeUtc: null,
  }));
}
function request(action: string, body: object) {
  const app = createPersonalAssetApp();
  app.onError((error, context) => {
    const http =
      error instanceof BusinessError ? toHttpException(error) : error;
    if (!(http instanceof HTTPException)) throw error;
    return context.json(
      { ok: false, message: http.message, data: http.cause },
      http.status
    );
  });
  return app.request(`/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("private asset HTTP boundary", () => {
  beforeEach(() => {
    state.actor = {
      ...assetActor(),
      permissions: permissions("personal.asset:read", "personal.asset:update"),
    };
    state.writes = 0;
    state.conflict = false;
    enterprise.register("assetProjection", {
      list: async () => [],
      assertReadable: async () => undefined,
      readableAssetSql: () => sql`1=1`,
    });
  });
  it("requires login, human identity and action-specific permissions", async () => {
    expect(isHodorAuthBypassed("/personal/asset/overview")).toBe(false);
    expect(isHodorAuthBypassed("/personal/asset/place")).toBe(false);
    state.actor = undefined;
    expect((await request("overview", { tenantId: 1 })).status).toBe(401);
    state.actor = {
      ...assetActor(),
      isSuperAdmin: true,
      principal: { kind: "api_token", tokenId: 1 },
    };
    expect((await request("overview", { tenantId: 1 })).status).toBe(403);
    expect((await request("place", placementInput())).status).toBe(403);
    state.actor = {
      ...assetActor(),
      permissions: permissions("personal.asset:read"),
    };
    expect((await request("overview", { tenantId: 1 })).status).toBe(200);
    expect((await request("place", placementInput())).status).toBe(403);
    state.actor = {
      ...assetActor(),
      permissions: permissions("personal.asset:update"),
    };
    expect((await request("overview", { tenantId: 1 })).status).toBe(403);
    expect((await request("place", placementInput())).status).toBe(200);
  });
  it("rejects owner and source identity injection before mutation", async () => {
    for (const property of [
      "ownerUserId",
      "userId",
      "version",
      "sourceSystem",
      "siteId",
      "clientId",
      "topic",
      "hostAssetId",
    ])
      expect(
        (
          await request("place", {
            ...placementInput(),
            [property]: "synthetic",
          })
        ).status
      ).toBe(422);
    expect(
      (await request("place", placementInput({ expectedVersion: 0 }))).status
    ).toBe(422);
    expect(
      (await request("overview", { tenantId: 1, ownerUserId: 102 })).status
    ).toBe(422);
    expect(state.writes).toBe(0);
  });
  it("keeps responses private and reports state conflicts with stable codes", async () => {
    const success = await request("overview", { tenantId: 1 });
    expect(success.headers.get("Cache-Control")).toBe("private, no-store");
    expect(success.headers.get("Vary")).toContain("Authorization");
    expect(await success.json()).toMatchObject({
      ok: true,
      data: { presenceSource: "unconfigured", assets: [] },
    });
    state.conflict = true;
    const conflict = await request("place", placementInput());
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      ok: false,
      data: { error: { code: "PERSONAL_ASSET_STATE_CONFLICT" } },
    });
    expect(
      (await request("place", placementInput({ site: "OpenLife", floor: 2 })))
        .status
    ).toBe(400);
  });
});
