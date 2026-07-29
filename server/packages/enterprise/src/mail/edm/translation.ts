import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const edmTranslations = {
  "enterprise.mail.edm": [],
} satisfies Record<
  Extract<BusinessKey, "enterprise.mail.edm">,
  TranslationInputItem[]
>;
