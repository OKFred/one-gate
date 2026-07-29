import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const familyTranslations = {
  "personal.family": [],
} satisfies Record<
  Extract<BusinessKey, "personal.family">,
  TranslationInputItem[]
>;
