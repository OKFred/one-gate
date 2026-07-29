import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const healthTranslations = {
  "personal.health": [],
} satisfies Record<
  Extract<BusinessKey, "personal.health">,
  TranslationInputItem[]
>;
