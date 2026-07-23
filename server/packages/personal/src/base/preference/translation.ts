import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const preferenceTranslations = {
  "personal.base.preference": [
    {
      application: "frontend",
      tKey: "mail.pref.saveSuccess",
      langCodes: {
        "zh-CN": "邮件通知偏好保存成功！",
        "en-US": "Email notification preferences saved successfully!",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.saveFailed",
      langCodes: {
        "zh-CN": "保存失败，请稍后重试",
        "en-US": "Save failed, please try again later",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.title",
      langCodes: {
        "zh-CN": "个人邮件通知偏好设置",
        "en-US": "Personal Email Notification Preferences",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.desc",
      langCodes: {
        "zh-CN": "自主控制接收异地登录安全告警与企业营销邮件提醒",
        "en-US":
          "Control receiving security alerts for remote logins and enterprise marketing emails",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.emailLabel",
      langCodes: {
        "zh-CN": "绑定的接收邮箱地址",
        "en-US": "Bound Email Address",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.emailHelper",
      langCodes: {
        "zh-CN": "用于接收系统告警与通知消息",
        "en-US": "Used to receive system alerts and notifications",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.securityTitle",
      langCodes: {
        "zh-CN": "安全与告警通知",
        "en-US": "Security & Alert Notifications",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.remoteLoginTitle",
      langCodes: {
        "zh-CN": "异地登录邮件安全告警",
        "en-US": "Remote Login Email Security Alert",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.remoteLoginDesc",
      langCodes: {
        "zh-CN":
          "当检测到您的账号在未常用 IP 登录时，自动向您发送防盗号安全提醒。",
        "en-US":
          "Automatically send you an anti-theft security alert when your account is logged in from an unusual IP.",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.marketingTitle",
      langCodes: {
        "zh-CN": "营销与资讯订阅",
        "en-US": "Marketing & Newsletter Subscriptions",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.edmTitle",
      langCodes: {
        "zh-CN": "接收企业营销与推广 EDM 邮件",
        "en-US": "Receive Enterprise Marketing and Promotion EDM Emails",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.edmDesc",
      langCodes: {
        "zh-CN":
          "接收企业优惠活动、产品更新与营销推广邮件（关闭后企业营销群发将自动过滤您的邮箱）。",
        "en-US":
          "Receive enterprise promotional activities, product updates, and marketing emails (when turned off, enterprise mass marketing will automatically filter out your email).",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.saving",
      langCodes: {
        "zh-CN": "正在保存...",
        "en-US": "Saving...",
      },
    },
    {
      application: "frontend",
      tKey: "mail.pref.saveBtn",
      langCodes: {
        "zh-CN": "保存偏好设置",
        "en-US": "Save Preferences",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "personal.base.preference">,
  TranslationInputItem[]
>;
