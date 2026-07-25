import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const dataTranslations = {
  "data.schema_form_data": [],
  "data.schema_form": [],
} satisfies Record<
  Extract<BusinessKey, "data.schema_form_data" | "data.schema_form">,
  TranslationInputItem[]
>;
