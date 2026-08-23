import { describe, expect, it } from "vitest";
import {
  extractLatestTreasury30YearYield,
  formatCronNotification,
  parseCronParameters,
} from "./notification.js";

const treasuryXml = `
<QR_BC_CM>
  <G_NEW_DATE>
    <BC_30YEAR>5.19</BC_30YEAR>
    <NEW_DATE>08-19-2026</NEW_DATE>
  </G_NEW_DATE>
  <G_NEW_DATE>
    <BC_30YEAR>5.27</BC_30YEAR>
    <NEW_DATE>08-21-2026</NEW_DATE>
  </G_NEW_DATE>
</QR_BC_CM>`;

describe("Cron notification", () => {
  it("keeps legacy request parameters compatible", () => {
    expect(parseCronParameters('{"query":{"id":1}}')).toEqual({
      request: { query: { id: 1 } },
    });
  });

  it("separates request and notification parameters", () => {
    expect(
      parseCronParameters(
        '{"request":{"query":{"id":1}},"notification":{"webhookSource":"feishu","formatter":"treasury_30y_yield"}}'
      )
    ).toEqual({
      request: { query: { id: 1 } },
      notification: {
        webhookSource: "feishu",
        formatter: "treasury_30y_yield",
      },
    });
  });

  it("extracts the latest 30-year Treasury yield", () => {
    expect(extractLatestTreasury30YearYield(treasuryXml)).toEqual({
      date: "2026-08-21",
      yieldPercent: "5.27",
    });
    expect(
      formatCronNotification("job", treasuryXml, {
        webhookSource: "feishu",
        formatter: "treasury_30y_yield",
        title: "30年期美债收益率",
      })
    ).toContain("收益率：5.27%");
  });
});
