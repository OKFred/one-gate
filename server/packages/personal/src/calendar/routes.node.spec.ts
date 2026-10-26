import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Context, UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
  toHttpException,
} from "@hodor/core/middleware/errorHandler/businessError";
import { HTTPException } from "hono/http-exception";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import ddl from "@hodor/core/db/sql/personal/personal_calendar_event.sql?raw";
import createCalendarApp from "./index";
import { syntheticCalendarInput } from "./calendar.contract-tests";
import {
  classifyAuthenticationRoute,
  isHodorAuthBypassed,
} from "@hodor/core/middleware/authenticationRoutePolicy";

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

function actor(): UserObj {
  return {
    principal: { kind: "user", userId: 27 },
    id: 27,
    userId: 27,
    username: "synthetic-route-user",
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-test-only",
    isSuperAdmin: false,
    roleIds: [],
    permissions: [],
    dataScope: "all",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}

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
  return app.request(`/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("private calendar HTTP contract", () => {
  beforeAll(() => setupTestDb(db, [ddl]));
  beforeEach(async () => {
    await clearTestData(db, ["personal_calendar_event"]);
    state.actor = actor();
    state.authCalls = 0;
  });
  it("still invokes the login gate with permission:false and denies API-token principals", async () => {
    for (const action of [
      "list",
      "get",
      "add",
      "update",
      "cancel",
      "due",
      "ack",
    ]) {
      expect(
        classifyAuthenticationRoute(`/personal/calendar/${action}`)
      ).toBeUndefined();
      expect(isHodorAuthBypassed(`/personal/calendar/${action}`)).toBe(false);
    }
    state.actor = undefined;
    expect((await request("due", {})).status).toBe(401);
    expect(state.authCalls).toBe(1);
    state.actor = { ...actor(), principal: { kind: "api_token", tokenId: 27 } };
    expect((await request("due", {})).status).toBe(403);
  });
  it("rejects owner/system-field injection and malformed versions before any mutation", async () => {
    for (const field of [
      "ownerUserId",
      "userId",
      "status",
      "version",
      "reminderAcknowledgedTimeUtc",
    ])
      expect(
        (await request("add", { ...syntheticCalendarInput(), [field]: 27 }))
          .status
      ).toBe(422);
    expect(
      (await request("cancel", { id: crypto.randomUUID(), expectedVersion: 0 }))
        .status
    ).toBe(422);
    expect((await request("due", { ownerUserId: 27 })).status).toBe(422);
  });
  it("returns stable semantic errors and private no-store headers without needing RBAC grants", async () => {
    const invalid = await request(
      "add",
      syntheticCalendarInput({ url: "file:///synthetic" })
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      ok: false,
      data: { error: { code: "CALENDAR_INVALID_INPUT" } },
    });
    const created = await request("add", syntheticCalendarInput());
    expect(created.status).toBe(200);
    expect(created.headers.get("Cache-Control")).toBe("private, no-store");
    const response: unknown = await created.json();
    expect(response).toMatchObject({
      ok: true,
      data: { status: "active", version: 1 },
    });
    expect(response).not.toHaveProperty("data.ownerUserId");
    expect(response).not.toHaveProperty("data.requestKey");
  });
  it("uses non-200 status codes for unknown records and duplicate-payload conflicts", async () => {
    const absent = await request("get", { id: crypto.randomUUID() });
    expect(absent.status).toBe(404);
    expect(await absent.json()).toMatchObject({
      ok: false,
      data: { error: { code: "CALENDAR_NOT_FOUND" } },
    });
    const input = syntheticCalendarInput();
    expect((await request("add", input)).status).toBe(200);
    const conflict = await request("add", {
      ...input,
      title: "Conflicting title",
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      ok: false,
      data: { error: { code: "CALENDAR_REQUEST_CONFLICT" } },
    });
  });
});
