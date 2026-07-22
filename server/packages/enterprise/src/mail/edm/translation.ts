import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const edmTranslations = {
  "enterprise.mail.edm": [
    {
      tKey: "mail.edm.error.invalidTemplateId",
      langCodes: {
        "zh-CN": "请填写有效的模板 ID",
        "en-US": "Please enter a valid Template ID",
      },
    },
    {
      tKey: "mail.edm.error.sendFailed",
      langCodes: {
        "zh-CN": "发送失败，请稍后重试",
        "en-US": "Send failed, please try again later",
      },
    },
    {
      tKey: "mail.edm.title",
      langCodes: {
        "zh-CN": "企业 EDM 营销邮件下发",
        "en-US": "Enterprise EDM Marketing Email Delivery",
      },
    },
    {
      tKey: "mail.edm.description",
      langCodes: {
        "zh-CN":
          "使用企业独立发信通道投递营销邮件，系统将自动过滤已退订营销邮件的客户。",
        "en-US":
          "Use the independent enterprise channel to deliver marketing emails. The system will automatically filter out customers who have unsubscribed.",
      },
    },
    {
      tKey: "mail.edm.success",
      langCodes: {
        "zh-CN": "营销 EDM 投递完成！",
        "en-US": "EDM Delivery Completed!",
      },
    },
    {
      tKey: "mail.edm.totalSent",
      langCodes: {
        "zh-CN": "总计划数",
        "en-US": "Total Planned",
      },
    },
    {
      tKey: "mail.edm.templateId",
      langCodes: {
        "zh-CN": "邮件模板 ID (Template ID)",
        "en-US": "Email Template ID",
      },
    },
    {
      tKey: "mail.edm.templateId.placeholder",
      langCodes: {
        "zh-CN": "请输入企业级邮件模板ID",
        "en-US": "Please enter enterprise email template ID",
      },
    },
    {
      tKey: "mail.edm.subject",
      langCodes: {
        "zh-CN": "自定义邮件主题 (选填)",
        "en-US": "Custom Email Subject (Optional)",
      },
    },
    {
      tKey: "mail.edm.subject.placeholder",
      langCodes: {
        "zh-CN": "留空则默认使用模板主题",
        "en-US": "Leave blank to use template subject",
      },
    },
    {
      tKey: "mail.edm.sending",
      langCodes: {
        "zh-CN": "正在批量投递中...",
        "en-US": "Sending in batch...",
      },
    },
    {
      tKey: "mail.edm.send",
      langCodes: {
        "zh-CN": "开始营销群发",
        "en-US": "Start Mass Marketing",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "enterprise.mail.edm">,
  TranslationInputItem[]
>;
