import { describe, expect, it, vi } from "vitest";
import { Validator } from "@cfworker/json-schema";
import {
  RecycleBinRegistry,
  RecycleBinUndoError,
  type RecycleBinResourceAdapter,
} from "@hodor/core/db/recycle-bin";
import type { UserObj } from "@hodor/core/types/app";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import api, { createRecycleBinHandlers } from "./service";

const user: UserObj = {
  id: 101,
  userId: 101,
  username: "undo-fixture",
  langCode: "en-US",
  isEnabled: true,
  token: "test-only",
  isSuperAdmin: false,
  roleIds: [],
  permissions: [],
  dataScope: "self_only",
  customDeptIds: [],
  ensureLoaded: async () => undefined,
};
const input = {
  resourceType: "notes",
  id: "note:7",
  expectedDeletedTimeUtc: 100,
};

function setup() {
  const registry = new RecycleBinRegistry();
  const undo = vi.fn(async () => "note:7");
  const can = vi.fn(async () => false);
  const resource: RecycleBinResourceAdapter = {
    resourceType: "notes",
    labelKey: "test.notes",
    can,
    list: async () => ({ total: 0, list: [] }),
    restore: vi.fn(async () => "note:7"),
    purge: async () => "note:7",
    undo,
    purgeExpired: async () => ({
      deletedCount: 0,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    }),
  };
  registry.register(resource);
  registry.register({ ...resource, resourceType: "legacy", undo: undefined });
  return { handlers: createRecycleBinHandlers(registry), resource, undo, can };
}

describe("generic short undo dispatch", () => {
  it("passes the original actor and string ID to optional business authorization without restore permissions", async () => {
    const { handlers, undo, can, resource } = setup();
    expect(await handlers.onUndo(input, user)).toBe("note:7");
    expect(undo).toHaveBeenCalledExactlyOnceWith(
      { id: "note:7", expectedDeletedTimeUtc: 100 },
      user
    );
    expect(resource.restore).not.toHaveBeenCalled();
    expect(can).not.toHaveBeenCalled();
  });

  it("preserves the adapter's refusal, expiry and business conflict", async () => {
    const { handlers, undo } = setup();
    for (const code of [
      RecycleBinUndoError.FORBIDDEN,
      RecycleBinUndoError.EXPIRED,
      "BUSINESS_CONFLICT",
    ]) {
      const error = new BusinessError(code);
      undo.mockRejectedValueOnce(error);
      await expect(handlers.onUndo(input, user)).rejects.toBe(error);
    }
  });

  it("rejects unsupported resources instead of falling back to privileged restore", async () => {
    const { handlers, undo, resource } = setup();
    await expect(
      handlers.onUndo({ ...input, resourceType: "legacy" }, user)
    ).rejects.toMatchObject({ code: RecycleBinUndoError.UNSUPPORTED });
    expect(undo).not.toHaveBeenCalled();
    expect(resource.restore).not.toHaveBeenCalled();
  });

  it.each(["unknown", "system_user", "__proto__", "notes\n"])(
    "rejects unregistered resource %s before adapter execution",
    async (resourceType) => {
      const { handlers, undo } = setup();
      await expect(
        handlers.onUndo({ ...input, resourceType }, user)
      ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
      expect(undo).not.toHaveBeenCalled();
    }
  );

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects unauthenticated actor ID %s even in direct service calls",
    async (userId) => {
      const { handlers, undo } = setup();
      await expect(
        handlers.onUndo(input, { ...user, userId })
      ).rejects.toMatchObject({ code: "NOT_AUTHENTICATED" });
      expect(undo).not.toHaveBeenCalled();
    }
  );

  it("uses strict mutation input with no client time/deleter override", () => {
    expect(api.undo.permission).toBe(false);
    expect(api.undo.pathInfo).toMatchObject({ path: "/undo", method: "post" });
    const validator = new Validator(api.undo.req as object);
    expect(validator.validate(input).valid).toBe(true);
    for (const invalid of [
      { ...input, now: 100 },
      { ...input, deleterId: 101 },
      { ...input, expectedDeletedTimeUtc: -1 },
    ])
      expect(validator.validate(invalid).valid).toBe(false);
  });
});
