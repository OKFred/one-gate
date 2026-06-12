import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const mailTranslations = {
  "mail.account": [
    {
      tKey: "account.title",
      langCodes: {
        "zh-CN": "邮件账户管理",
        "en-US": "Mail Account Management",
      },
    },
    {
      tKey: "account.table.nickname",
      langCodes: {
        "zh-CN": "昵称",
        "en-US": "Nickname",
      },
    },
    {
      tKey: "account.table.email",
      langCodes: {
        "zh-CN": "邮箱",
        "en-US": "Email",
      },
    },
    {
      tKey: "account.table.host",
      langCodes: {
        "zh-CN": "主机",
        "en-US": "Host",
      },
    },
    {
      tKey: "account.table.port",
      langCodes: {
        "zh-CN": "端口",
        "en-US": "Port",
      },
    },
    {
      tKey: "account.table.password",
      langCodes: {
        "zh-CN": "密码",
        "en-US": "Password",
      },
    },
  ],
  "mail.action": [
    {
      tKey: "send.dialog.customFrom",
      langCodes: {
        "zh-CN": "或直接输入发件邮箱",
        "en-US": "Or input sender email directly",
      },
    },
    {
      tKey: "send.dialog.customFromHelp",
      langCodes: {
        "zh-CN": "如果没有配置的账户，可以直接输入邮箱地址",
        "en-US": "If no account configured, you can input email directly",
      },
    },
    {
      tKey: "send.dialog.recipientName",
      langCodes: {
        "zh-CN": "姓名",
        "en-US": "Name",
      },
    },
    {
      tKey: "send.dialog.recipientEmail",
      langCodes: {
        "zh-CN": "邮箱",
        "en-US": "Email",
      },
    },
    {
      tKey: "send.dialog.addRecipient",
      langCodes: {
        "zh-CN": "添加收件人",
        "en-US": "Add recipient",
      },
    },
    {
      tKey: "send.dialog.removeRecipient",
      langCodes: {
        "zh-CN": "移除收件人",
        "en-US": "Remove recipient",
      },
    },
    {
      tKey: "send.dialog.subject",
      langCodes: {
        "zh-CN": "主题",
        "en-US": "Subject",
      },
    },
    {
      tKey: "send.dialog.contentLoaded",
      langCodes: {
        "zh-CN": "模板内容已加载，您可以在此基础上编辑...",
        "en-US": "Template content loaded, you can edit it...",
      },
    },
    {
      tKey: "send.action.send",
      langCodes: {
        "zh-CN": "发送",
        "en-US": "Send",
      },
    },
    {
      tKey: "send.title",
      langCodes: {
        "zh-CN": "发送邮件",
        "en-US": "Send Mail",
      },
    },
    {
      tKey: "send.recipients",
      langCodes: {
        "zh-CN": "收件人",
        "en-US": "Recipients",
      },
    },
    {
      tKey: "send.addRecipient",
      langCodes: {
        "zh-CN": "添加收件人",
        "en-US": "Add recipient",
      },
    },
    {
      tKey: "send.noTemplate",
      langCodes: {
        "zh-CN": "不使用模板 - 手动编写内容",
        "en-US": "No template - write content manually",
      },
    },
    {
      tKey: "send.templateName",
      langCodes: {
        "zh-CN": "模板名",
        "en-US": "Template",
      },
    },
    {
      tKey: "send.creator",
      langCodes: {
        "zh-CN": "创建人",
        "en-US": "Creator",
      },
    },
    {
      tKey: "send.category",
      langCodes: {
        "zh-CN": "分类",
        "en-US": "Category",
      },
    },
    {
      tKey: "send.dialog.contentLabel",
      langCodes: {
        "zh-CN": "邮件内容",
        "en-US": "Mail Content",
      },
    },
  ],
  "mail.template": [
    {
      tKey: "template.title",
      langCodes: {
        "zh-CN": "邮件模板管理",
        "en-US": "Mail Template Management",
      },
    },
    {
      tKey: "template.table.name",
      langCodes: {
        "zh-CN": "模板名称",
        "en-US": "Template Name",
      },
    },
    {
      tKey: "template.table.nameHelp",
      langCodes: {
        "zh-CN": "邮件模板的唯一标识名称",
        "en-US": "Unique identifier for the template",
      },
    },
    {
      tKey: "template.table.subject",
      langCodes: {
        "zh-CN": "邮件标题",
        "en-US": "Mail Subject",
      },
    },
    {
      tKey: "template.table.subjectHelp",
      langCodes: {
        "zh-CN": "邮件的主题行",
        "en-US": "Subject line of the mail",
      },
    },
    {
      tKey: "template.table.langCodeHelp",
      langCodes: {
        "zh-CN": "模板使用的语言代码（可选）",
        "en-US": "Language code for the template (optional)",
      },
    },
    {
      tKey: "template.table.category",
      langCodes: {
        "zh-CN": "模板分类",
        "en-US": "Template Category",
      },
    },
    {
      tKey: "template.table.categoryHelp",
      langCodes: {
        "zh-CN": "模板的分类标签（可选）",
        "en-US": "Category tag for the template (optional)",
      },
    },
    {
      tKey: "template.table.contentLabel",
      langCodes: {
        "zh-CN": "邮件内容",
        "en-US": "Mail Content",
      },
    },
    {
      tKey: "template.table.contentHelp",
      langCodes: {
        "zh-CN": "使用富文本编辑器编写邮件模板内容，支持HTML格式",
        "en-US": "Use the rich text editor; HTML supported",
      },
    },
    {
      tKey: "template.table.title",
      langCodes: {
        "zh-CN": "邮件标题",
        "en-US": "Mail Subject",
      },
    },
    {
      tKey: "dialog.title.preview",
      langCodes: {
        "zh-CN": "预览",
        "en-US": "Preview",
      },
    },
    {
      tKey: "template.preview.basicInfo",
      langCodes: {
        "zh-CN": "基本信息",
        "en-US": "Basic Info",
      },
    },
    {
      tKey: "template.preview.tags",
      langCodes: {
        "zh-CN": "标签",
        "en-US": "Tags",
      },
    },
  ],
  "mail.log": [
    {
      tKey: "log.table.templateParams",
      langCodes: {
        "zh-CN": "模板参数",
        "en-US": "Template Parameters",
      },
    },
    {
      tKey: "log.table.errorCode",
      langCodes: {
        "zh-CN": "错误代码",
        "en-US": "Error Code",
      },
    },
    {
      tKey: "log.table.errorDetails",
      langCodes: {
        "zh-CN": "错误详情",
        "en-US": "Error Details",
      },
    },
    {
      tKey: "log.title",
      langCodes: {
        "zh-CN": "邮件发送日志",
        "en-US": "Mail Send Log",
      },
    },
    {
      tKey: "log.table.basicInfo",
      langCodes: {
        "zh-CN": "基本信息",
        "en-US": "Basic Information",
      },
    },
    {
      tKey: "log.table.timeInfo",
      langCodes: {
        "zh-CN": "时间信息",
        "en-US": "Time Information",
      },
    },
    {
      tKey: "log.table.templateInfo",
      langCodes: {
        "zh-CN": "模板信息",
        "en-US": "Template Information",
      },
    },
    {
      tKey: "log.table.errorInfo",
      langCodes: {
        "zh-CN": "错误信息",
        "en-US": "Error Information",
      },
    },
    {
      tKey: "log.table.subject",
      langCodes: {
        "zh-CN": "标题",
        "en-US": "Subject",
      },
    },
    {
      tKey: "log.table.recipient",
      langCodes: {
        "zh-CN": "收件人",
        "en-US": "Recipient",
      },
    },
    {
      tKey: "log.table.sender",
      langCodes: {
        "zh-CN": "发件人",
        "en-US": "Sender",
      },
    },
    {
      tKey: "log.table.sendTime",
      langCodes: {
        "zh-CN": "发送时间",
        "en-US": "Send Time",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    "mail.account" | "mail.action" | "mail.template" | "mail.log"
  >,
  TranslationInputItem[]
>;
