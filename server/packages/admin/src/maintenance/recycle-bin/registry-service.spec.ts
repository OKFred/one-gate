import { validate } from "@cfworker/json-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RecycleBinRegistry,
  type RecycleBinAction,
  type RecycleBinListQuery,
  type RecycleBinMutation,
  type RecycleBinRecordId,
  type RecycleBinResourceAdapter,
} from "@hodor/core/db/recycle-bin";
import type { UserObj } from "@hodor/core/types/app";
import { can } from "@hodor/core/middleware/auth/permission";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import api, { createRecycleBinHandlers } from "./service";
import {
  RecycleBinResourcesReq,
  RecycleBinResourcesRes,
  RecycleBinListRes,
  RecycleBinMutationReq,
  RecycleBinMutationRes,
} from "./model";

const entry = "admin.maintenance.recycle_bin:";
const serverTimeUtc = 1_000;
const mutation = {
  resourceType: "documents",
  id: "doc:alpha-7",
  expectedDeletedTimeUtc: 100,
};

function actor(codes: string[] = [], superAdmin = false): UserObj {
  return {
    id: 27,
    userId: 27,
    username: "recycle-reviewer",
    langCode: "zh-CN",
    isEnabled: true,
    token: "test-only",
    isSuperAdmin: superAdmin,
    roleIds: [],
    permissions: codes.map((code, index) => ({
      id: index + 1,
      code,
      name: code,
      category: "action",
      resource: null,
      business: null,
      remark: null,
      isEnabled: true,
      creatorId: 27,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: null,
    })),
    dataScope: "custom",
    customDeptIds: [51],
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
  };
}

function deletedItem(id: RecycleBinRecordId) {
  return {
    resourceType: "injected-resource",
    id,
    name: "A deleted item",
    deleterId: 27,
    deleterName: null,
    deletedTimeUtc: 100,
    expiresTimeUtc: 2_592_000_100,
    canRestore: true,
    payload: "private business data",
    secretToken: "private token",
  };
}

function resource(resourceType: string, id: RecycleBinRecordId) {
  return {
    resourceType,
    labelKey: `test.resource.${resourceType}`,
    privateConfiguration: "not public",
    can: vi.fn((action: RecycleBinAction, user: UserObj) =>
      can(user, action, `test.${resourceType}`)
    ),
    list: vi.fn(async (_query: RecycleBinListQuery, _user: UserObj) => ({
      total: 1,
      list: [deletedItem(id)],
    })),
    restore: vi.fn(
      async (input: RecycleBinMutation, _user: UserObj) => input.id
    ),
    purge: vi.fn(async (input: RecycleBinMutation, _user: UserObj) => input.id),
    purgeExpired: vi.fn(async () => ({
      deletedCount: 0,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    })),
  } satisfies RecycleBinResourceAdapter & { privateConfiguration: string };
}

describe("registered recycle-bin resources", () => {
  let departments: ReturnType<typeof resource>;
  let documents: ReturnType<typeof resource>;
  let handlers: ReturnType<typeof createRecycleBinHandlers>;

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(serverTimeUtc);
    const registry = new RecycleBinRegistry();
    departments = resource("department", 7);
    documents = resource("documents", "doc:alpha-7");
    registry.register(departments);
    registry.register(documents);
    handlers = createRecycleBinHandlers(registry);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("distinguishes denied entry permission from an empty visible catalog", async () => {
    await expect(handlers.onResources({}, actor())).rejects.toThrow(
      "PERMISSION_DENIED"
    );
    expect(documents.can).not.toHaveBeenCalled();
    expect(departments.can).not.toHaveBeenCalled();
    expect(await handlers.onResources({}, actor([`${entry}read`]))).toEqual({
      list: [],
    });
    expect(documents.list).not.toHaveBeenCalled();
    expect(departments.list).not.toHaveBeenCalled();
  });

  it("returns visible resource metadata and effective capabilities only", async () => {
    const user = actor([
      `${entry}read`,
      `${entry}restore`,
      `${entry}purge`,
      "test.documents:read",
      "test.documents:restore",
      "test.documents:purge",
    ]);
    const result = await handlers.onResources({}, user);
    expect(result).toEqual({
      list: [
        {
          resourceType: "documents",
          labelKey: "test.resource.documents",
          canRestore: true,
          canPurge: false,
        },
      ],
    });
    expect(validate(result, RecycleBinResourcesRes).valid).toBe(true);
    expect(documents.can).toHaveBeenCalledWith("read", user);
  });

  it("dispatches string IDs, paging, deletion versions and actor scope to the selected resource", async () => {
    const user = actor([
      `${entry}read`,
      `${entry}restore`,
      "test.documents:read",
      "test.documents:restore",
    ]);
    const result = await handlers.onList(
      { resourceType: "documents", keyword: "A", pageNo: 2, pageSize: 5 },
      user
    );
    expect(documents.list).toHaveBeenCalledWith(
      { keyword: "A", pageNo: 2, pageSize: 5 },
      user
    );
    expect(documents.list.mock.calls[0][1]).toBe(user);
    expect(result).toMatchObject({
      serverTimeUtc,
      canRestore: true,
      canPurge: false,
      currentPage: 2,
      pageSize: 5,
      totalPage: 1,
      list: [{ resourceType: "documents", id: "doc:alpha-7" }],
    });
    expect(result.list[0]).not.toHaveProperty("payload");
    expect(result.list[0]).not.toHaveProperty("secretToken");
    expect(validate(result, RecycleBinListRes).valid).toBe(true);
    expect(await handlers.onRestore(mutation, user)).toBe("doc:alpha-7");
    expect(documents.restore).toHaveBeenCalledWith(
      { id: "doc:alpha-7", expectedDeletedTimeUtc: 100 },
      user
    );
    expect(documents.restore.mock.calls[0][1]).toBe(user);
    expect(departments.list).not.toHaveBeenCalled();
    expect(departments.restore).not.toHaveBeenCalled();
  });

  it("keeps record restore eligibility separate from current action permission", async () => {
    const result = await handlers.onList(
      { resourceType: "documents" },
      actor([`${entry}read`, "test.documents:read"])
    );
    expect(result.canRestore).toBe(false);
    expect(result.list[0].canRestore).toBe(true);
  });

  it("uses one response time for expiry boundaries without overriding business vetoes", async () => {
    const item = deletedItem(mutation.id);
    documents.list.mockResolvedValue({
      total: 4,
      list: [
        { ...item, id: "before", expiresTimeUtc: serverTimeUtc + 1 },
        { ...item, id: "at", expiresTimeUtc: serverTimeUtc },
        { ...item, id: "after", expiresTimeUtc: serverTimeUtc - 1 },
        { ...item, id: "veto", canRestore: false },
      ],
    });
    const result = await handlers.onList(
      { resourceType: "documents" },
      actor([], true)
    );
    expect(result.serverTimeUtc).toBe(serverTimeUtc);
    expect(result.canRestore).toBe(true);
    expect(
      result.list.map(({ id, canRestore }) => ({ id, canRestore }))
    ).toEqual([
      { id: "before", canRestore: true },
      { id: "at", canRestore: false },
      { id: "after", canRestore: false },
      { id: "veto", canRestore: false },
    ]);
  });

  it("expires a row when the list query crosses its deadline", async () => {
    const item = deletedItem(mutation.id);
    documents.list.mockImplementation(async () => {
      await Promise.resolve();
      vi.mocked(Date.now).mockReturnValue(item.expiresTimeUtc);
      return { total: 1, list: [item] };
    });
    const result = await handlers.onList(
      { resourceType: "documents" },
      actor([], true)
    );
    expect(result.serverTimeUtc).toBe(item.expiresTimeUtc);
    expect(result.list[0].canRestore).toBe(false);
  });

  it.each(["restore", "purge"] as const)(
    "samples response time after asynchronous %s permission checks",
    async (delayedAction) => {
      const item = deletedItem(mutation.id);
      documents.can.mockImplementation(async (action, user) => {
        if (action === delayedAction) {
          await Promise.resolve();
          vi.mocked(Date.now).mockReturnValue(item.expiresTimeUtc);
        }
        return can(user, action, "test.documents");
      });
      const result = await handlers.onList(
        { resourceType: "documents" },
        actor([], true)
      );
      expect(result.serverTimeUtc).toBe(item.expiresTimeUtc);
      expect(result.canRestore).toBe(true);
      expect(result.canPurge).toBe(true);
      expect(result.list[0].canRestore).toBe(false);
    }
  );

  it("includes the final current-superadmin reload in the response-time boundary", async () => {
    const item = deletedItem(mutation.id);
    const user = actor([], true);
    let purgePermissionChecked = false;
    documents.can.mockImplementation(async (action, currentUser) => {
      const allowed = await can(currentUser, action, "test.documents");
      if (action === "purge") purgePermissionChecked = true;
      return allowed;
    });
    user.ensureLoaded = async () => {
      if (purgePermissionChecked) {
        await Promise.resolve();
        vi.mocked(Date.now).mockReturnValue(item.expiresTimeUtc);
        user.isSuperAdmin = false;
      }
    };
    const result = await handlers.onList({ resourceType: "documents" }, user);
    expect(result.serverTimeUtc).toBe(item.expiresTimeUtc);
    expect(result.canPurge).toBe(false);
    expect(result.list[0].canRestore).toBe(false);
  });

  it.each(["read", "restore", "purge"] as const)(
    "requires both entry and business permission for %s",
    async (action) => {
      for (const codes of [
        [`${entry}${action}`],
        [`test.documents:${action}`],
      ]) {
        const user = actor(codes);
        const operation =
          action === "read"
            ? handlers.onList({ resourceType: "documents" }, user)
            : action === "restore"
              ? handlers.onRestore(mutation, user)
              : handlers.onPurge(mutation, user);
        await expect(operation).rejects.toThrow("PERMISSION_DENIED");
      }
      expect(documents.list).not.toHaveBeenCalled();
      expect(documents.restore).not.toHaveBeenCalled();
      expect(documents.purge).not.toHaveBeenCalled();
    }
  );

  it.each([
    "system_user",
    "not-registered",
    "__proto__",
    "department;DROP TABLE x",
  ])(
    "rejects an unregistered resource without calling any adapter: %s",
    async (resourceType) => {
      const user = actor([], true);
      await expect(handlers.onList({ resourceType }, user)).rejects.toThrow(
        "INVALID_PARAMS"
      );
      await expect(
        handlers.onRestore({ ...mutation, resourceType }, user)
      ).rejects.toThrow("INVALID_PARAMS");
      await expect(
        handlers.onPurge({ ...mutation, resourceType }, user)
      ).rejects.toThrow("INVALID_PARAMS");
      for (const adapter of [departments, documents]) {
        expect(adapter.can).not.toHaveBeenCalled();
        expect(adapter.list).not.toHaveBeenCalled();
        expect(adapter.restore).not.toHaveBeenCalled();
        expect(adapter.purge).not.toHaveBeenCalled();
      }
    }
  );

  it("does not promote an ordinary account with both purge permissions", async () => {
    const user = actor([`${entry}purge`, "test.documents:purge"]);
    user.id = 1;
    user.userId = 1;
    user.username = "superadmin";
    await expect(handlers.onPurge(mutation, user)).rejects.toThrow(
      "PERMISSION_DENIED"
    );
    expect(documents.purge).not.toHaveBeenCalled();
  });

  it("rechecks current superadmin state after asynchronous business authorization", async () => {
    const user = actor([], true);
    documents.can.mockImplementation(async () => {
      user.isSuperAdmin = false;
      return true;
    });
    await expect(handlers.onPurge(mutation, user)).rejects.toThrow(
      "PERMISSION_DENIED"
    );
    expect(documents.purge).not.toHaveBeenCalled();
    expect(user.ensureLoaded).toHaveBeenCalledTimes(2);
  });

  it("preserves business vetoes and conflicts even for a current superadmin", async () => {
    const user = actor([], true);
    expect(await handlers.onPurge(mutation, user)).toBe("doc:alpha-7");
    expect(documents.purge).toHaveBeenCalledWith(
      { id: "doc:alpha-7", expectedDeletedTimeUtc: 100 },
      user
    );
    const conflict = new BusinessError("RESOURCE_CONFLICT");
    documents.restore.mockRejectedValue(conflict);
    await expect(handlers.onRestore(mutation, user)).rejects.toBe(conflict);
    documents.can.mockResolvedValue(false);
    await expect(handlers.onPurge(mutation, user)).rejects.toThrow(
      "PERMISSION_DENIED"
    );
    expect(documents.purge).toHaveBeenCalledTimes(1);
  });

  it("publishes pure POST APIs with strict resources input and number or string IDs", () => {
    expect(
      Object.values(api).every(
        (operation) => operation.pathInfo.method === "post"
      )
    ).toBe(true);
    expect(api.resources.pathInfo.path).toBe("/resources");
    expect(api.resources.permission).toEqual({ action: "read" });
    expect(validate({}, RecycleBinResourcesReq).valid).toBe(true);
    expect(
      validate({ resourceType: "documents" }, RecycleBinResourcesReq).valid
    ).toBe(false);
    expect(validate(mutation, RecycleBinMutationReq).valid).toBe(true);
    expect(
      validate(
        { ...mutation, resourceType: "documents\n" },
        RecycleBinMutationReq
      ).valid
    ).toBe(false);
    expect(validate({ ...mutation, id: 7 }, RecycleBinMutationReq).valid).toBe(
      true
    );
    expect(validate("doc:alpha-7", RecycleBinMutationRes).valid).toBe(true);
    for (const id of [0, -1, 1.5, "", "   ", "a".repeat(257)]) {
      expect(validate({ ...mutation, id }, RecycleBinMutationReq).valid).toBe(
        false
      );
    }
  });
});
