import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const attendanceTranslations = {
  "organization.attendance": [
    {
      application: "backend",
      tKey: "errorHandler.checkOutTimeEarly",
      langCodes: {
        "zh-CN": "签退时间早于或等于签到时间",
        "en-US":
          "Check-out time cannot be earlier than or equal to check-in time",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "organization.attendance">,
  TranslationInputItem[]
>;
