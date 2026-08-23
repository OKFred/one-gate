import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import apiTaskSql from "@hodor/core/db/sql/admin/maintenance_api_task.sql?raw";
import { apiTaskTable } from "../api-task/model.js";
import {
  ServiceRegistry,
  setRegistry,
  type IAdminServices,
} from "../../common/registry.js";
import { HttpJobExecutor } from "./executor.js";

describe("HTTP Cron Webhook notification", () => {
  const send = vi.fn();

  beforeAll(async () => {
    await setupTestDb(db, [apiTaskSql]);
    const registry = new ServiceRegistry();
    registry.register("base", {
      httpFetch: {
        fetch: async () =>
          new Response(
            "<G_NEW_DATE><BC_30YEAR>5.27</BC_30YEAR><NEW_DATE>08-21-2026</NEW_DATE></G_NEW_DATE>",
            { status: 200 }
          ),
      },
      webhook: { send },
    } as unknown as IAdminServices["base"]);
    setRegistry(registry);
  });

  beforeEach(async () => {
    await clearTestData(db, ["maintenance_api_task"]);
    send.mockReset();
    send.mockResolvedValue({ source: "feishu", statusCode: 200 });
  });

  it("formats a Treasury response and invokes the configured Webhook source", async () => {
    await db.insert(apiTaskTable).values({
      taskKey: "us_treasury_30y_yield",
      name: "30年期美债收益率",
      baseUrl: "https://home.treasury.gov",
      path: "/yield.xml",
      method: "GET",
      timeoutMs: 30000,
      isEnabled: true,
      creatorId: 1,
    });

    const result = await new HttpJobExecutor().execute(
      {
        jobKey: "us_treasury_30y_yield",
        name: "每日跟踪30年期美债收益率",
        parameters: JSON.stringify({
          request: {},
          notification: {
            webhookSource: "feishu",
            formatter: "treasury_30y_yield",
            title: "30年期美债收益率",
          },
        }),
      },
      db
    );

    expect(result.status).toBe(true);
    expect(result.responseBody).toContain("收益率：5.27%");
    expect(send).toHaveBeenCalledWith({
      source: "feishu",
      text: expect.stringContaining("收益率：5.27%"),
    });
  });
});
