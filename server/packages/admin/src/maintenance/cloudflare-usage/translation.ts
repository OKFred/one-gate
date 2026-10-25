import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";
export const cloudflareUsageTranslations = {
  "admin.maintenance.cloudflare_usage": [
    {
      application: "backend",
      tKey: "businessType.admin.maintenance.cloudflare_usage",
      langCodes: { "zh-CN": "Cloudflare 用量", "en-US": "Cloudflare usage" },
    },
  ],
} satisfies Partial<Record<BusinessKey, TranslationInputItem[]>>;
