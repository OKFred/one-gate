import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { UserObj } from "@hodor/core/types/app";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import webhookConfigSql from "@hodor/core/db/sql/admin/base_webhook_config.sql?raw";
import service from "./service.js";

describe("Webhook config", () => {
  const userObj = { userId: 1 } as unknown as UserObj;

  beforeAll(async () => {
    await setupTestDb(db, [webhookConfigSql]);
  });

  beforeEach(async () => {
    await clearTestData(db, ["base_webhook_config"]);
  });

  it("supports CRUD, primary selection and masked list output", async () => {
    const firstId = await service.add.service(
      {
        source: "Feishu",
        url: "https://open.feishu.cn/open-apis/bot/v2/hook/first-secret",
        isEnabled: true,
        isPrimary: true,
      },
      userObj
    );
    const secondId = await service.add.service(
      {
        source: "feishu",
        url: "https://open.feishu.cn/open-apis/bot/v2/hook/second-secret",
        isEnabled: true,
        isPrimary: true,
      },
      userObj
    );

    const list = await service.list.service({ pageNo: 1, pageSize: 10 });
    expect(list.total).toBe(2);
    expect(list.list.every((item) => !item.url.includes("second-secret"))).toBe(
      true
    );

    const firstDetail = await service.detail.service({ id: firstId! });
    const secondDetail = await service.detail.service({ id: secondId! });
    expect(firstDetail.isPrimary).toBe(false);
    expect(secondDetail.isPrimary).toBe(true);
    expect(secondDetail.url).toContain("second-secret");

    await service.delete.service({ id: firstId! });
    expect(
      (await service.list.service({ pageNo: 1, pageSize: 10 })).total
    ).toBe(1);
  });

  it("rejects non-HTTPS URLs", async () => {
    await expect(
      service.add.service(
        {
          source: "feishu",
          url: "http://example.com/hook",
          isEnabled: true,
          isPrimary: true,
        },
        userObj
      )
    ).rejects.toThrow();
  });
});
