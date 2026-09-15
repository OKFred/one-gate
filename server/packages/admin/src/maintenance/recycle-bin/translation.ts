import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const recycleBinTranslations = {
  "admin.maintenance.recycle_bin": [
    {
      application: "backend",
      tKey: "businessType.admin.maintenance.recycle_bin",
      langCodes: { "zh-CN": "回收站", "en-US": "Recycle bin" },
    },
  ],
} satisfies Partial<Record<BusinessKey, TranslationInputItem[]>>;
