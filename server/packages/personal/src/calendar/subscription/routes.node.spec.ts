import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { Context, UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
  toHttpException,
} from "@hodor/core/middleware/errorHandler/businessError";
import {
  classifyAuthenticationRoute,
  isHodorAuthBypassed,
} from "@hodor/core/middleware/authenticationRoutePolicy";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { setEnv } from "@hodor/core/utils/env";
import { ensureAdminRegistry } from "@hodor/admin/register";
import subscriptionDdl from "@hodor/core/db/sql/personal/personal_calendar_subscription.sql?raw";
import eventDdl from "@hodor/core/db/sql/personal/personal_calendar_event.sql?raw";
import userDdl from "@hodor/core/db/sql/admin/system_user.sql?raw";
import createCalendarApp from "../index";
import { calendarActor } from "../calendar.contract-tests";

const state = vi.hoisted(() => ({
  actor: undefined as UserObj | undefined,
  authCalls: 0,
}));
vi.mock("@hodor/core/middleware/auth", () => ({
  authMiddleware: async (context: Context) => {
    state.authCalls += 1;
    if (!state.actor)
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    context.set("userObj", state.actor);
  },
}));
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));

function request(action: string, body: object) {
  const app = createCalendarApp();
  app.onError((error, context) => {
    const http =
      error instanceof BusinessError ? toHttpException(error) : error;
    if (!(http instanceof HTTPException)) throw error;
    return context.json(
      { ok: false, message: http.message, data: http.cause },
      http.status
    );
  });
  return app.request(`/subscription/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("private calendar subscription management HTTP contract", () => {
  beforeAll(async () => {
    ensureAdminRegistry();
    await setupTestDb(db, [userDdl, eventDdl, subscriptionDdl]);
  });
  beforeEach(async () => {
    await clearTestData(db, ["personal_calendar_subscription", "system_user"]);
    for (const id of [17, 18])
      await db.run(
        sql`INSERT INTO system_user(id,username,password,lang_code,role_id_arr,is_enabled,creator_id,create_time_utc) VALUES (${id},${`synthetic-subscription-route-${id}`},'synthetic-unusable-hash','en-US','[]',1,${id},1)`
      );
    setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: "https://calendar.example.test" });
    state.actor = calendarActor(17);
    state.authCalls = 0;
  });
  afterEach(() => setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: "" }));

  it("keeps all three routes behind the human login gate without requiring assignable permissions", async () => {
    for (const action of ["status", "rotate", "revoke"]) {
      const path = `/personal/calendar/subscription/${action}`;
      expect(classifyAuthenticationRoute(path)).toBeUndefined();
      expect(isHodorAuthBypassed(path)).toBe(false);
      const body = action === "status" ? {} : { expectedVersion: null };
      state.actor = undefined;
      expect((await request(action, body)).status).toBe(401);
      state.actor = {
        ...calendarActor(17, true),
        principal: { kind: "api_token", tokenId: 17 },
      };
      expect((await request(action, body)).status).toBe(403);
    }
    expect(state.authCalls).toBe(6);
    state.actor = calendarActor(17);
    expect((await request("rotate", { expectedVersion: null })).status).toBe(
      200
    );
  });

  it("rejects client owner, token and version injection before any mutation", async () => {
    for (const field of [
      "ownerUserId",
      "userId",
      "tokenHash",
      "token",
      "version",
    ])
      expect(
        (await request("rotate", { expectedVersion: null, [field]: 18 })).status
      ).toBe(422);
    for (const body of [
      {},
      { expectedVersion: 0 },
      { expectedVersion: -1 },
      { expectedVersion: "1" },
      { expectedVersion: 1.5 },
    ])
      expect((await request("revoke", body)).status).toBe(422);
    expect((await request("status", { ownerUserId: 18 })).status).toBe(422);
    expect(await (await request("status", {})).json()).toMatchObject({
      ok: true,
      data: { enabled: false, version: null },
    });
  });

  it("returns the link once, separates owners and keeps metadata and revocation responses private", async () => {
    const rotation = await request("rotate", { expectedVersion: null });
    expect(rotation.status).toBe(200);
    expect(rotation.headers.get("cache-control")).toBe("private, no-store");
    expect(rotation.headers.get("cloudflare-cdn-cache-control")).toBe(
      "no-store"
    );
    expect(rotation.headers.get("referrer-policy")).toBe("no-referrer");
    expect(rotation.headers.get("vary")).toContain("Authorization");
    expect(rotation.headers.get("vary")).toContain("Cookie");
    expect(await rotation.json()).toMatchObject({
      ok: true,
      data: { subscriptionUrl: expect.any(String), version: 1 },
    });
    const status = await (await request("status", {})).json();
    expect(status).toMatchObject({
      ok: true,
      data: { configured: true, enabled: true, version: 1 },
    });
    expect(status).not.toHaveProperty("data.subscriptionUrl");
    expect(status).not.toHaveProperty("data.tokenHash");
    expect(status).not.toHaveProperty("data.ownerUserId");
    state.actor = calendarActor(18, true);
    expect(await (await request("status", {})).json()).toMatchObject({
      data: { enabled: false, version: null },
    });
    state.actor = calendarActor(17);
    expect(
      await (await request("revoke", { expectedVersion: 1 })).json()
    ).toEqual({
      ok: true,
      message: "OK",
      data: { version: 2, updatedTimeUtc: expect.any(Number) },
    });
  });

  it("returns stable conflict and disabled-configuration business codes while allowing revocation", async () => {
    expect((await request("rotate", { expectedVersion: null })).status).toBe(
      200
    );
    const stale = await request("rotate", { expectedVersion: null });
    expect(stale.status).toBe(409);
    expect(stale.headers.get("cache-control")).toBe("private, no-store");
    expect(stale.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await stale.json()).toMatchObject({
      ok: false,
      data: { error: { code: "CALENDAR_SUBSCRIPTION_STATE_CONFLICT" } },
    });
    setEnv({ CALENDAR_SUBSCRIPTION_ORIGIN: "" });
    const disabled = await request("rotate", { expectedVersion: 1 });
    expect(disabled.status).toBe(503);
    expect(disabled.headers.get("cache-control")).toBe("private, no-store");
    expect(disabled.headers.get("cloudflare-cdn-cache-control")).toBe(
      "no-store"
    );
    expect(disabled.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await disabled.json()).toMatchObject({
      ok: false,
      data: { error: { code: "CALENDAR_SUBSCRIPTION_UNAVAILABLE" } },
    });
    expect((await request("revoke", { expectedVersion: 1 })).status).toBe(200);
  });
});
