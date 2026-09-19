import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const recycleBinTranslations = {
  "admin.maintenance.recycle_bin": [
    {
      application: "backend",
      tKey: "errorHandler.recycleBin.undoExpired",
      langCodes: {
        "zh-CN": "撤销删除的15秒期限已结束",
        "en-US": "The 15-second undo window has expired",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.recycleBin.undoForbidden",
      langCodes: {
        "zh-CN": "只有本次删除人且仍有删除权限才能撤销",
        "en-US":
          "Only the person who deleted this record, with current delete permission, can undo it",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.recycleBin.undoUnsupported",
      langCodes: {
        "zh-CN": "此类记录不支持撤销删除",
        "en-US": "Undo deletion is not supported for this resource",
      },
    },
    {
      application: "backend",
      tKey: "businessType.admin.maintenance.recycle_bin",
      langCodes: { "zh-CN": "回收站", "en-US": "Recycle bin" },
    },
  ],
} satisfies Partial<Record<BusinessKey, TranslationInputItem[]>>;
