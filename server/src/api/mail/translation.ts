import type { BatchTranslationItem } from "@/db/initTranslation";

export const mailTranslations: BatchTranslationItem[] = [
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件账户管理",
      "en-US": "Mail Account Management",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.nickname",
    isEnabled: true,
    langCodes: {
      "zh-CN": "昵称",
      "en-US": "Nickname",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.email",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮箱",
      "en-US": "Email",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.host",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主机",
      "en-US": "Host",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.port",
    isEnabled: true,
    langCodes: {
      "zh-CN": "端口",
      "en-US": "Port",
    },
  },
  {
    application: "frontend",
    business: "mail.account",
    tKey: "account.table.password",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码",
      "en-US": "Password",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.customFrom",
    isEnabled: true,
    langCodes: {
      "zh-CN": "或直接输入发件邮箱",
      "en-US": "Or input sender email directly",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.customFromHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "如果没有配置的账户，可以直接输入邮箱地址",
      "en-US": "If no account configured, you can input email directly",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.recipientName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "姓名",
      "en-US": "Name",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.recipientEmail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮箱",
      "en-US": "Email",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.addRecipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加收件人",
      "en-US": "Add recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.removeRecipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "移除收件人",
      "en-US": "Remove recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.subject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "主题",
      "en-US": "Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.contentLoaded",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板内容已加载，您可以在此基础上编辑...",
      "en-US": "Template content loaded, you can edit it...",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.action.send",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送",
      "en-US": "Send",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板管理",
      "en-US": "Mail Template Management",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送邮件",
      "en-US": "Send Mail",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.recipients",
    isEnabled: true,
    langCodes: {
      "zh-CN": "收件人",
      "en-US": "Recipients",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.addRecipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加收件人",
      "en-US": "Add recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.noTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "不使用模板 - 手动编写内容",
      "en-US": "No template - write content manually",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.templateName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板名",
      "en-US": "Template",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.creator",
    isEnabled: true,
    langCodes: {
      "zh-CN": "创建人",
      "en-US": "Creator",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "分类",
      "en-US": "Category",
    },
  },
  {
    application: "frontend",
    business: "mail.action",
    tKey: "send.dialog.contentLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件内容",
      "en-US": "Mail Content",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板名称",
      "en-US": "Template Name",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.nameHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板的唯一标识名称",
      "en-US": "Unique identifier for the template",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.subject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件标题",
      "en-US": "Mail Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.subjectHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件的主题行",
      "en-US": "Subject line of the mail",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.langCodeHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板使用的语言代码（可选）",
      "en-US": "Language code for the template (optional)",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板分类",
      "en-US": "Template Category",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.categoryHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板的分类标签（可选）",
      "en-US": "Category tag for the template (optional)",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.contentLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件内容",
      "en-US": "Mail Content",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.contentHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "使用富文本编辑器编写邮件模板内容，支持HTML格式",
      "en-US": "Use the rich text editor; HTML supported",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.table.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件标题",
      "en-US": "Mail Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "dialog.title.preview",
    isEnabled: true,
    langCodes: {
      "zh-CN": "预览",
      "en-US": "Preview",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.preview.basicInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基本信息",
      "en-US": "Basic Info",
    },
  },
  {
    application: "frontend",
    business: "mail.template",
    tKey: "template.preview.tags",
    isEnabled: true,
    langCodes: {
      "zh-CN": "标签",
      "en-US": "Tags",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.templateParams",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板参数",
      "en-US": "Template Parameters",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.errorCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误代码",
      "en-US": "Error Code",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.errorDetails",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误详情",
      "en-US": "Error Details",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件发送日志",
      "en-US": "Mail Send Log",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.basicInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基本信息",
      "en-US": "Basic Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.timeInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "时间信息",
      "en-US": "Time Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.templateInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模板信息",
      "en-US": "Template Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.errorInfo",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误信息",
      "en-US": "Error Information",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.subject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "标题",
      "en-US": "Subject",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.recipient",
    isEnabled: true,
    langCodes: {
      "zh-CN": "收件人",
      "en-US": "Recipient",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.sender",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发件人",
      "en-US": "Sender",
    },
  },
  {
    application: "frontend",
    business: "mail.log",
    tKey: "log.table.sendTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送时间",
      "en-US": "Send Time",
    },
  },
];
