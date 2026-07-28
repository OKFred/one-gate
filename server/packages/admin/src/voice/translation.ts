import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

/**
 * 实时通话（App-to-App）翻译词条
 * 仅用于后端异常信息
 */
export const voiceTranslations: Partial<
  Record<BusinessKey, TranslationInputItem[]>
> = {
  "admin.voice": [],
  "admin.voice.session": [],
};
