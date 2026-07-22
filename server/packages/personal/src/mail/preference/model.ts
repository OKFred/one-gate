import type { JSONSchema } from "json-schema-to-ts";

export const PersonalPreferenceUpdateReqVO = {
  email: { type: "string", description: "关联的个人邮箱地址" },
  remoteLoginWarn: {
    type: "boolean",
    description: "是否开启异地登录告警邮件提醒",
  },
  marketingEdm: { type: "boolean", description: "是否订阅企业营销EDM邮件" },
} as const satisfies Record<string, JSONSchema>;

export const PersonalPreferenceResVO = {
  email: { type: "string" },
  remoteLoginWarn: { type: "boolean" },
  marketingEdm: { type: "boolean" },
} as const satisfies Record<string, JSONSchema>;

export const PersonalPreferenceUpdateResVO = {
  success: { type: "boolean" },
} as const satisfies Record<string, JSONSchema>;
