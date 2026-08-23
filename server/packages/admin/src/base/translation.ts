import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const baseTranslations: Partial<
  Record<BusinessKey, TranslationInputItem[]>
> = {
  "admin.base": [],
  "admin.base.webhook_config": [],
};
