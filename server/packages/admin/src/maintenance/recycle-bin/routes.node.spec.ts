import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context, UserObj } from "@hodor/core/types/app";
import { recycleBinRegistry } from "@hodor/core/db/recycle-bin";
import {
  BusinessError,
  toHttpException,
} from "@hodor/core/middleware/errorHandler/businessError";
import createApp from "./index";

const state = vi.hoisted(() => ({
  resourceReadable: true,
  list: vi.fn(async () => ({ total: 0, list: [] })),
  restore: vi.fn(async () => "document/1"),
  purge: vi.fn(async () => "document/1"),
}));

const actor: UserObj = {
  id: 27,
  userId: 27,
  username: "route-fixture",
  langCode: "en-US",
  isEnabled: true,
  token: "test-only",
  isSuperAdmin: false,
  roleIds: [],
  permissions: [],
  dataScope: "all",
  customDeptIds: [],
  ensureLoaded: async () => undefined,
};

vi.mock("@hodor/core/middleware/auth", () => ({
  authMiddleware: async (context: Context) => context.set("userObj", actor),
}));
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));

recycleBinRegistry.register({
  resourceType: "route_document",
  labelKey: "test.document",
  can: async () => state.resourceReadable,
  list: state.list,
  restore: state.restore,
  purge: state.purge,
  purgeExpired: async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  }),
});

function request(path: string, body: object) {
  const app = createApp();
  app.onError((error, context) => {
    if (!(error instanceof BusinessError)) throw error;
    return context.json(
      { ok: false, code: error.code },
      toHttpException(error).status
    );
  });
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("recycle-bin HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.resourceReadable = true;
    actor.isSuperAdmin = false;
    actor.permissions = ["read", "restore", "purge"].map((action, index) => ({
      id: index + 1,
      code: `admin.maintenance.recycle_bin:${action}`,
      name: action,
      category: "action",
      resource: null,
      business: null,
      remark: null,
      isEnabled: true,
      creatorId: 27,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: null,
    }));
  });

  it("protects the catalogue with route permissions and filters unreadable resources", async () => {
    actor.permissions = [];
    expect((await request("/resources", {})).status).toBe(403);
    actor.isSuperAdmin = true;
    state.resourceReadable = false;
    expect(await (await request("/resources", {})).json()).toMatchObject({
      ok: true,
      data: { list: [] },
    });
    expect(state.list).not.toHaveBeenCalled();
  });

  it("routes the discovered resource with string IDs while denying assignable purge permission", async () => {
    const catalogue = await request("/resources", {});
    expect(await catalogue.json()).toMatchObject({
      ok: true,
      data: {
        list: [
          { resourceType: "route_document", canRestore: true, canPurge: false },
        ],
      },
    });
    const body = {
      resourceType: "route_document",
      id: "document/1",
      expectedDeletedTimeUtc: 123,
    };
    expect(await (await request("/restore", body)).json()).toMatchObject({
      ok: true,
      data: "document/1",
    });
    expect(state.restore).toHaveBeenCalledExactlyOnceWith(
      { id: "document/1", expectedDeletedTimeUtc: 123 },
      actor
    );
    expect((await request("/purge", body)).status).toBe(403);
    expect(state.purge).not.toHaveBeenCalled();
  });

  it("rejects unknown tables and malformed mutation requests before a business method runs", async () => {
    expect(
      (await request("/list", { resourceType: "system_user" })).status
    ).toBe(400);
    const mutation = { resourceType: "route_document", id: "document/1" };
    expect((await request("/restore", mutation)).status).toBe(422);
    expect(
      (
        await request("/restore", {
          ...mutation,
          expectedDeletedTimeUtc: 123,
          isDeleted: false,
        })
      ).status
    ).toBe(422);
    expect(
      (await request("/resources", { tableName: "system_user" })).status
    ).toBe(422);
    expect(state.list).not.toHaveBeenCalled();
    expect(state.restore).not.toHaveBeenCalled();
  });
});
