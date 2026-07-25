import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const financialTranslations = {
  "personal.finance": [],
} satisfies Record<
  Extract<BusinessKey, "personal.finance">,
  TranslationInputItem[]
>;
