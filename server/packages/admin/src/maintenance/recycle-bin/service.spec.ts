import { validate } from "@cfworker/json-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserObj } from "@hodor/core/types/app";
import {
  toHttpException,
  BusinessError,
} from "@hodor/core/middleware/errorHandler/businessError";

const departments = vi.hoisted(() => ({
  listDeletedDepartments: vi.fn(),
  restoreDeletedDepartment: vi.fn(),
  purgeDeletedDepartment: vi.fn(),
}));
vi.mock("../../system/department/service", () => departments);
vi.mock("../../system/department/repository", () => ({
  purgeExpiredDepartments: vi.fn(),
}));
vi.mock("@hodor/core/middleware/auth/cache-invalidation", () => ({
  invalidateAuthCache: vi.fn(),
}));

import { RecycleBinRegistry } from "@hodor/core/db/recycle-bin";
import { departmentRecycleBinAdapter } from "../../system/department/recycle-bin";
import { createRecycleBinHandlers } from "./service";
import {
  RecycleBinListReq,
  RecycleBinListRes,
  RecycleBinMutationReq,
} from "./model";

const registry = new RecycleBinRegistry();
registry.register(departmentRecycleBinAdapter);
const { onList, onRestore, onPurge } = createRecycleBinHandlers(registry);

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
    dataScope: "all",
    customDeptIds: [],
    ensureLoaded: vi.fn().mockResolvedValue(undefined),
  };
}

const mutation = {
  resourceType: "department",
  id: 9,
  expectedDeletedTimeUtc: 123,
} as const;
const readCodes = [
  "admin.maintenance.recycle_bin:read",
  "admin.system.department:read",
];
const restoreCodes = [
  "admin.maintenance.recycle_bin:restore",
  "admin.system.department:edit",
];
const serverTimeUtc = 300;

describe("recycle bin access and public contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(serverTimeUtc);
    departments.listDeletedDepartments.mockResolvedValue({
      total: 0,
      list: [],
    });
    departments.restoreDeletedDepartment.mockResolvedValue(9);
    departments.purgeDeletedDepartment.mockResolvedValue(9);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([[], [readCodes[0]], [readCodes[1]]])(
    "requires both read permissions: %j",
    async (...codes) => {
      await expect(
        onList({ resourceType: "department" }, actor(codes))
      ).rejects.toThrow("PERMISSION_DENIED");
      expect(departments.listDeletedDepartments).not.toHaveBeenCalled();
    }
  );

  it("returns only the permitted summary and current purge capability", async () => {
    departments.listDeletedDepartments.mockResolvedValue({
      total: 21,
      list: [
        {
          id: 9,
          name: "Archived department",
          deleterId: 7,
          deleterName: null,
          deletedTimeUtc: 123,
          expiresTimeUtc: 456,
          canRestore: true,
          remark: "not public",
          isDeleted: true,
        },
      ],
    });
    const result = await onList(
      {
        resourceType: "department",
        pageNo: 2,
        pageSize: 10,
        keyword: "Archived",
      },
      actor(readCodes)
    );
    expect(result).toMatchObject({
      serverTimeUtc,
      total: 21,
      totalPage: 3,
      currentPage: 2,
      pageSize: 10,
      canPurge: false,
    });
    expect(result.list[0]).not.toHaveProperty("remark");
    expect(result.list[0]).not.toHaveProperty("isDeleted");
    expect(validate(result, RecycleBinListRes).valid).toBe(true);
    expect(departments.listDeletedDepartments).toHaveBeenCalledWith({
      keyword: "Archived",
      pageNo: 2,
      pageSize: 10,
    });
  });

  it("requires a nonnegative integer server time even for an empty list", async () => {
    const result = await onList(
      { resourceType: "department" },
      actor(readCodes)
    );
    expect(result.serverTimeUtc).toBe(serverTimeUtc);
    expect(result.list).toEqual([]);
    const { serverTimeUtc: _serverTimeUtc, ...withoutTime } = result;
    expect(validate(withoutTime, RecycleBinListRes).valid).toBe(false);
    for (const invalidTime of [null, -1, 1.5, "300"]) {
      expect(
        validate({ ...result, serverTimeUtc: invalidTime }, RecycleBinListRes)
          .valid
      ).toBe(false);
    }
  });

  it("allows unknown deleters but requires both record timestamps", async () => {
    departments.listDeletedDepartments.mockResolvedValue({
      total: 1,
      list: [
        {
          id: 9,
          name: "Archived department",
          deleterId: null,
          deleterName: null,
          deletedTimeUtc: 123,
          expiresTimeUtc: 456,
          canRestore: true,
        },
      ],
    });
    const result = await onList(
      { resourceType: "department" },
      actor(readCodes)
    );
    expect(validate(result, RecycleBinListRes).valid).toBe(true);
    for (const timestamp of ["deletedTimeUtc", "expiresTimeUtc"] as const) {
      expect(
        validate(
          { ...result, list: [{ ...result.list[0], [timestamp]: null }] },
          RecycleBinListRes
        ).valid
      ).toBe(false);
    }
  });

  it.each([[], [restoreCodes[0]], [restoreCodes[1]]])(
    "requires both restore permissions: %j",
    async (...codes) => {
      await expect(onRestore(mutation, actor(codes))).rejects.toThrow(
        "PERMISSION_DENIED"
      );
      expect(departments.restoreDeletedDepartment).not.toHaveBeenCalled();
    }
  );

  it("passes the expected deletion version and authenticated actor to restoration", async () => {
    expect(await onRestore(mutation, actor(restoreCodes))).toBe(9);
    expect(departments.restoreDeletedDepartment).toHaveBeenCalledWith(
      9,
      123,
      27
    );
  });

  it("purge permission, a special username, or user ID 1 cannot confer superadmin", async () => {
    const user = actor(["admin.maintenance.recycle_bin:purge"]);
    user.id = 1;
    user.userId = 1;
    user.username = "superadmin";
    try {
      await onPurge(mutation, user);
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessError);
      if (!(error instanceof BusinessError)) throw error;
      expect(toHttpException(error).status).toBe(403);
    }
    expect(departments.purgeDeletedDepartment).not.toHaveBeenCalled();
  });

  it("reloads superadmin state before exposing capability or allowing purge", async () => {
    const user = actor(readCodes, true);
    user.ensureLoaded = vi.fn(async () => {
      user.isSuperAdmin = false;
    });
    expect((await onList({ resourceType: "department" }, user)).canPurge).toBe(
      false
    );
    await expect(onPurge(mutation, user)).rejects.toThrow("PERMISSION_DENIED");
    expect(departments.purgeDeletedDepartment).not.toHaveBeenCalled();
  });

  it("lets a current superadmin purge using the observed version", async () => {
    expect(await onPurge(mutation, actor([], true))).toBe(9);
    expect(departments.purgeDeletedDepartment).toHaveBeenCalledWith(9, 123, 27);
  });

  it("preserves domain conflicts without reporting success", async () => {
    departments.restoreDeletedDepartment.mockRejectedValue(
      new BusinessError("errorHandler.department.nameConflict")
    );
    await expect(onRestore(mutation, actor(restoreCodes))).rejects.toThrow(
      "errorHandler.department.nameConflict"
    );
  });

  it.each(["9", "record:9", 0, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects a non-department ID before business mutation: %s",
    async (id) => {
      await expect(
        onRestore({ ...mutation, id }, actor(restoreCodes))
      ).rejects.toThrow("INVALID_PARAMS");
      await expect(
        onPurge({ ...mutation, id }, actor([], true))
      ).rejects.toThrow("INVALID_PARAMS");
      expect(departments.restoreDeletedDepartment).not.toHaveBeenCalled();
      expect(departments.purgeDeletedDepartment).not.toHaveBeenCalled();
    }
  );

  it("rejects deletion field injection and missing version", () => {
    for (const body of [
      { ...mutation, isDeleted: false },
      { resourceType: "department", id: 9 },
      { ...mutation, expectedDeletedTimeUtc: -1 },
    ])
      expect(validate(body, RecycleBinMutationReq).valid).toBe(false);
    expect(
      validate(
        { resourceType: "department", includeDeleted: true },
        RecycleBinListReq
      ).valid
    ).toBe(false);
    expect(
      validate({ resourceType: "department", pageSize: 101 }, RecycleBinListReq)
        .valid
    ).toBe(false);
  });
});
