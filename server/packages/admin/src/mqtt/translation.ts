import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const mqttTranslations: Partial<
  Record<BusinessKey, TranslationInputItem[]>
> = {
  "admin.mqtt": [],
};
