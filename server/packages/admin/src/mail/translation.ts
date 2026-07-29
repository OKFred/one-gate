import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const mailTranslations = {
  "mail.account": [],
  "mail.action": [
    {
      application: "backend",
      tKey: "errorHandler.mail.action.sendFailed",
      langCodes: {
        "zh-CN": "邮件发送失败，请检查配置或网络连接",
        "en-US":
          "Mail sending failed, please check configuration or network connection",
      },
    },
  ],
  "mail.template": [],
  "mail.log": [],
} satisfies Record<
  Extract<
    BusinessKey,
    "mail.account" | "mail.action" | "mail.template" | "mail.log"
  >,
  TranslationInputItem[]
>;
