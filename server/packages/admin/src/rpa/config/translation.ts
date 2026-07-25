import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const configTranslations = {
  "admin.rpa.config": [],
} satisfies Record<
  Extract<BusinessKey, "admin.rpa.config">,
  TranslationInputItem[]
>;
