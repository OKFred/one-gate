import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const preferenceTranslations = {
  "personal.mail.preference": [],
} satisfies Record<
  Extract<BusinessKey, "personal.mail.preference">,
  TranslationInputItem[]
>;
