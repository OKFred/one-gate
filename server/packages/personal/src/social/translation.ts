import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const socialTranslations = {
  "personal.social": [],
} satisfies Record<
  Extract<BusinessKey, "personal.social">,
  TranslationInputItem[]
>;
