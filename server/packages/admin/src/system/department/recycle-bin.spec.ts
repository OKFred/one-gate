import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  purgeExpired: vi.fn(),
  invalidateAuthCache: vi.fn(),
}));
vi.mock("./repository", () => ({
  purgeExpiredDepartments: dependencies.purgeExpired,
}));
vi.mock("./service", () => ({
  listDeletedDepartments: vi.fn(),
  restoreDeletedDepartment: vi.fn(),
  purgeDeletedDepartment: vi.fn(),
}));
vi.mock("@hodor/core/middleware/auth/cache-invalidation", () => ({
  invalidateAuthCache: dependencies.invalidateAuthCache,
}));

import {
  departmentRecycleBinAdapter,
  purgeExpiredDepartments,
} from "./recycle-bin";

describe("department recycle-bin cleanup adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([0, 2])(
    "invalidates authorization only after physical deletion: %s",
    async (deletedCount) => {
      const result = {
        deletedCount,
        remainingExpired: 3,
        oldestExpiredTimeUtc: 100,
      };
      dependencies.purgeExpired.mockResolvedValue(result);
      const input = { now: 300, batchSize: 100 };
      expect(departmentRecycleBinAdapter.purgeExpired).toBe(
        purgeExpiredDepartments
      );
      expect(await departmentRecycleBinAdapter.purgeExpired(input)).toBe(
        result
      );
      expect(dependencies.purgeExpired).toHaveBeenCalledWith(input);
      expect(dependencies.invalidateAuthCache).toHaveBeenCalledTimes(
        deletedCount > 0 ? 1 : 0
      );
    }
  );

  it("propagates cleanup failure and does not invalidate authorization", async () => {
    const error = new Error("cleanup failed");
    dependencies.purgeExpired.mockRejectedValue(error);
    await expect(
      purgeExpiredDepartments({ now: 300, batchSize: 100 })
    ).rejects.toBe(error);
    expect(dependencies.invalidateAuthCache).not.toHaveBeenCalled();
  });
});
