import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import ossConfigService from "../service";
import type { UserObj } from "@hodor/core/types/app";

// 静态导入 SQL 文件
import ossConfigSql from "@hodor/core/db/sql/admin/base_sys_config.sql?raw";

// 模拟 storage 模块以防止调用真实的 S3
vi.mock("@hodor/core/utils/storage", () => {
  return {
    getStorage: vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue({
        objects: [],
        isTruncated: false,
        cursor: undefined,
      }),
    }),
  };
});

import { initAdminRegistry } from "../../../register";

describe("OSS Config 模块集成测试", () => {
  const testTables = ["base_sys_config"];
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    initAdminRegistry();
    await setupTestDb(db, [ossConfigSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  describe("对象存储配置 (CRUD & default排他)", () => {
    it("全流程配置管理与默认值排他逻辑测试", async () => {
      // 1. Add first config as default
      const config1Id = await ossConfigService.add.service(
        {
          name: "S3 Storage 1",
          provider: "S3",
          endpoint: "http://localhost:9000",
          accessKey: "accessKey1",
          secretKey: "secretKey1",
          bucket: "bucket1",
          region: "auto",
          isEnabled: true,
          isDefault: true,
          remark: "First storage",
        },
        userObj
      );
      expect(config1Id).toBeGreaterThan(0);

      // Verify it is default
      const config1 = await ossConfigService.get.service({ id: config1Id! });
      expect(config1?.isDefault).toBe(true);

      // 2. Add second config as default (should clear first config's default)
      const config2Id = await ossConfigService.add.service(
        {
          name: "R2 Storage 2",
          provider: "R2",
          accountId: "accountId2",
          accessKey: "accessKey2",
          secretKey: "secretKey2",
          bucket: "bucket2",
          region: "auto",
          isEnabled: true,
          isDefault: true,
          remark: "Second storage",
        },
        userObj
      );
      expect(config2Id).toBeGreaterThan(0);

      // Verify second is default, first is NOT default anymore
      const config1After = await ossConfigService.get.service({
        id: config1Id!,
      });
      const config2After = await ossConfigService.get.service({
        id: config2Id!,
      });
      expect(config1After?.isDefault).toBe(false);
      expect(config2After?.isDefault).toBe(true);

      // 3. Update config1 to be default again
      await ossConfigService.update.service(
        {
          id: config1Id!,
          name: "S3 Storage 1 Updated",
          isDefault: true,
          region: "auto",
        },
        userObj
      );

      // Verify first is default again, second is NOT
      const config1Updated = await ossConfigService.get.service({
        id: config1Id!,
      });
      const config2Updated = await ossConfigService.get.service({
        id: config2Id!,
      });
      expect(config1Updated?.isDefault).toBe(true);
      expect(config1Updated?.name).toBe("S3 Storage 1 Updated");
      expect(config2Updated?.isDefault).toBe(false);

      // 4. Delete config1
      const deletedId = await ossConfigService.delete.service({
        id: config1Id!,
      });
      expect(deletedId).toBe(config1Id);

      await expect(
        ossConfigService.get.service({ id: config1Id! })
      ).rejects.toThrow();
    });

    it("列表查询分页与过滤测试", async () => {
      await ossConfigService.add.service(
        {
          name: "Test Storage A",
          provider: "S3",
          accessKey: "akA",
          secretKey: "skA",
          bucket: "bucketA",
          region: "auto",
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );

      await ossConfigService.add.service(
        {
          name: "Test Storage B",
          provider: "R2",
          accessKey: "akB",
          secretKey: "skB",
          bucket: "bucketB",
          region: "auto",
          isEnabled: false,
          isDefault: false,
        },
        userObj
      );

      // listAll (不分页)
      const allList = await ossConfigService.listAll.service({});
      expect(allList.length).toBe(2);

      // list (分页 + status 过滤)
      const pageResult = await ossConfigService.list.service({
        isEnabled: true,
        pageNo: 1,
        pageSize: 10,
      });
      expect(pageResult.total).toBe(1);
      expect(pageResult.list[0].name).toBe("Test Storage A");
    });
  });
});
