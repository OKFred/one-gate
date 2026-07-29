import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { registry } from "@hodor/admin/common/registry.js";

import { EdmSendBatchReqVO, EdmSendBatchResVO } from "./model.js";

const sendBatchReq = {
  type: "object",
  properties: {
    ...EdmSendBatchReqVO,
  },
  required: ["templateId"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const sendBatchRes = {
  type: "object",
  properties: {
    ...EdmSendBatchResVO,
  },
  required: ["totalSent", "successCount", "failCount"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onSendBatch(
  params: FromSchema<typeof sendBatchReq>,
  userObj: UserObj
): Promise<FromSchema<typeof sendBatchRes>> {
  const { templateId, subject, tenantId, recipientIds } = params;

  // 1. 查询该租户下 scope=biz 且同意接收营销 EDM 的收件人列表
  const { list } = await registry.mail.recipient.list({
    scope: "biz",
    tenantId,
    marketingEdm: true,
    pageNo: 1,
    pageSize: 5000,
  });

  let targetRecipients = (list || []) as unknown as {
    id: number;
    email: string;
    name?: string | null;
  }[];
  if (recipientIds && recipientIds.length > 0) {
    targetRecipients = targetRecipients.filter((r) =>
      recipientIds.includes(r.id)
    );
  }

  let successCount = 0;
  let failCount = 0;

  // 2. 使用底座发信引擎批量异步投递（使用企业 biz 发信通道）
  for (const item of targetRecipients) {
    try {
      const ok = await registry.mail.send({
        templateId,
        subject,
        scope: "biz",
        tenantId,
        receiverArr: [{ name: item.name || "", address: item.email }],
        templateParams: {
          name: item.name || item.email,
        },
      });
      if (ok) {
        successCount++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
  }

  return {
    totalSent: targetRecipients.length,
    successCount,
    failCount,
  };
}

const sendBatchApi = {
  req: sendBatchReq,
  res: sendBatchRes,
  pathInfo: {
    path: "/sendBatch",
    method: "post",
    summary: "企业级 EDM 营销邮件批量下发",
  } as const,
  adapter: bodyUserAdapter,
  service: onSendBatch,
  permission: { action: "create" },
} satisfies API;

const service = {
  sendBatch: sendBatchApi,
};

export default service;
