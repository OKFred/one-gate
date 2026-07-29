import type { JSONSchema } from "json-schema-to-ts";

export const EdmSendBatchReqVO = {
  templateId: { type: "number", description: "邮件模板ID" },
  subject: { type: "string", description: "邮件主题（覆写）" },
  tenantId: { type: "number", description: "企业租户ID" },
  recipientIds: {
    type: "array",
    items: { type: "number" },
    description: "指定接收人ID列表（留空则发送给该租户所有订阅客户）",
  },
} as const satisfies Record<string, JSONSchema>;

export const EdmSendBatchResVO = {
  totalSent: { type: "number" },
  successCount: { type: "number" },
  failCount: { type: "number" },
} as const satisfies Record<string, JSONSchema>;
