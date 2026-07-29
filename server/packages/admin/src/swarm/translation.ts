import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const swarmTranslations = {
  "swarm.docker_config": [],
  swarm: [],
} satisfies Record<
  Extract<BusinessKey, "swarm.docker_config" | "swarm">,
  TranslationInputItem[]
>;
