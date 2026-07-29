import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const workflowTranslations = {
  "executive.workflow": [],
} satisfies Record<
  Extract<BusinessKey, "executive.workflow">,
  TranslationInputItem[]
>;
