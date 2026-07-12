import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const profileTranslations = {
  "personal.profile": [
    {
      tKey: "personal.profile.realName",
      langCodes: {
        "zh-CN": "姓名",
        "en-US": "Name",
      },
    },
    {
      tKey: "personal.profile.gender",
      langCodes: {
        "zh-CN": "性别",
        "en-US": "Gender",
      },
    },
    {
      tKey: "personal.profile.email",
      langCodes: {
        "zh-CN": "邮箱",
        "en-US": "Email",
      },
    },
    {
      tKey: "personal.profile.phone",
      langCodes: {
        "zh-CN": "手机号",
        "en-US": "Phone Number",
      },
    },
    {
      tKey: "personal.profile.remark",
      langCodes: {
        "zh-CN": "备注",
        "en-US": "Remark",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "personal.profile">,
  TranslationInputItem[]
>;
