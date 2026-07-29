import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import swarmDockerConfigService from "../service";
import type { UserObj } from "@hodor/core/types/app";

// 静态导入 SQL 文件
import swarmDockerConfigSql from "@hodor/core/db/sql/admin/base_sys_config.sql?raw";

// 模拟 dockerClient 以防止网络调用与真实连接
vi.mock("../../docker/client", () => {
  return {
    dockerClient: {
      reset: vi.fn(),
      testRawConnection: vi.fn().mockResolvedValue(true),
    },
  };
});

import { initAdminRegistry } from "../../../register";

describe("Swarm Docker Config 模块集成测试", () => {
  const testTables = ["base_sys_config"];
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    initAdminRegistry();
    await setupTestDb(db, [swarmDockerConfigSql]);
    await clearTestData(db, testTables);
  });

  afterEach(async () => {
    await clearTestData(db, testTables);
  });

  describe("Docker 配置 (CRUD & default排他)", () => {
    it("全流程配置管理与默认值排他逻辑测试", async () => {
      // 1. Add first config as default
      const config1Id = await swarmDockerConfigService.add.service(
        {
          name: "Docker Swarm Core",
          host: "tcp://127.0.0.1:2375",
          apiVersion: "v1.45",
          tlsVerify: false,
          isEnabled: true,
          isDefault: true,
          remark: "First swarm config",
        },
        userObj
      );
      expect(config1Id).toBeGreaterThan(0);

      // Verify it is default
      const config1 = await swarmDockerConfigService.get.service({
        id: config1Id!,
      });
      expect(config1?.isDefault).toBe(true);

      // 2. Add second config as default (should clear first config's default)
      const config2Id = await swarmDockerConfigService.add.service(
        {
          name: "Docker Swarm Backup",
          host: "tcp://127.0.0.1:2376",
          apiVersion: "v1.45",
          tlsVerify: false,
          isEnabled: true,
          isDefault: true,
          remark: "Second swarm config",
        },
        userObj
      );
      expect(config2Id).toBeGreaterThan(0);

      // Verify second is default, first is NOT default anymore
      const config1After = await swarmDockerConfigService.get.service({
        id: config1Id!,
      });
      const config2After = await swarmDockerConfigService.get.service({
        id: config2Id!,
      });
      expect(config1After?.isDefault).toBe(false);
      expect(config2After?.isDefault).toBe(true);

      // 3. Update config1 to be default again
      await swarmDockerConfigService.update.service(
        {
          id: config1Id!,
          name: "Docker Swarm Core Updated",
          isDefault: true,
        },
        userObj
      );

      // Verify first is default again, second is NOT
      const config1Updated = await swarmDockerConfigService.get.service({
        id: config1Id!,
      });
      const config2Updated = await swarmDockerConfigService.get.service({
        id: config2Id!,
      });
      expect(config1Updated?.isDefault).toBe(true);
      expect(config1Updated?.name).toBe("Docker Swarm Core Updated");
      expect(config2Updated?.isDefault).toBe(false);

      // 4. Delete config1
      const deletedId = await swarmDockerConfigService.delete.service({
        id: config1Id!,
      });
      expect(deletedId).toBe(config1Id);

      await expect(
        swarmDockerConfigService.get.service({ id: config1Id! })
      ).rejects.toThrow();
    });

    it("列表查询分页与过滤测试", async () => {
      await swarmDockerConfigService.add.service(
        {
          name: "Swarm A",
          host: "tcp://10.0.0.1:2375",
          apiVersion: "v1.45",
          tlsVerify: false,
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );

      await swarmDockerConfigService.add.service(
        {
          name: "Swarm B",
          host: "tcp://10.0.0.2:2375",
          apiVersion: "v1.45",
          tlsVerify: false,
          isEnabled: false,
          isDefault: false,
        },
        userObj
      );

      // listAll (不分页)
      const allList = await swarmDockerConfigService.listAll.service({});
      expect(allList.length).toBe(2);

      // list (分页 + isEnabled 过滤)
      const pageResult = await swarmDockerConfigService.list.service({
        isEnabled: true,
        pageNo: 1,
        pageSize: 10,
      });
      expect(pageResult.total).toBe(1);
      expect(pageResult.list[0].name).toBe("Swarm A");
    });

    it("连通性验证接口测试", async () => {
      const configId = await swarmDockerConfigService.add.service(
        {
          name: "Swarm Connection Test",
          host: "tcp://10.0.0.3:2375",
          apiVersion: "v1.45",
          tlsVerify: false,
          isEnabled: true,
          isDefault: false,
        },
        userObj
      );

      const verifyResult = await swarmDockerConfigService.verify.service({
        id: configId!,
      });
      expect(verifyResult).toBe(true);
    });
  });
});
