import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { registry } from "@hodor/admin/common/registry.js";
import {
  PersonalPreferenceResVO,
  PersonalPreferenceUpdateReqVO,
  PersonalPreferenceUpdateResVO,
} from "./model.js";

const getReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...PersonalPreferenceResVO,
  },
  required: ["email", "remoteLoginWarn", "marketingEdm"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  _params: FromSchema<typeof getReq>,
  userObj: UserObj
): Promise<FromSchema<typeof getRes>> {
  const userId = Number(userObj.id || userObj.userId || 0);

  const { list } = await registry.mail.recipient.list({
    scope: "user",
    userId,
    pageNo: 1,
    pageSize: 1,
  });

  const preference = list && list.length > 0 ? list[0] : null;

  return {
    email: (preference?.email ||
      (userObj as unknown as { email?: string }).email ||
      "") as string,
    remoteLoginWarn: (preference?.remoteLoginWarn ?? true) as boolean,
    marketingEdm: (preference?.marketingEdm ?? true) as boolean,
  };
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取当前用户邮件通知偏好",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...PersonalPreferenceUpdateReqVO,
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  type: "object",
  properties: {
    ...PersonalPreferenceUpdateResVO,
  },
  required: ["success"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes>> {
  const userId = Number(userObj.id || userObj.userId || 0);
  const email = (params.email ||
    (userObj as unknown as { email?: string }).email ||
    "user@example.com") as string;

  const { list } = await registry.mail.recipient.list({
    scope: "user",
    userId,
    pageNo: 1,
    pageSize: 1,
  });

  const existing = list && list.length > 0 ? list[0] : null;

  if (existing) {
    await registry.mail.recipient.update(
      {
        id: Number(existing.id),
        email,
        scope: "user",
        remoteLoginWarn: (params.remoteLoginWarn ??
          existing.remoteLoginWarn) as boolean,
        marketingEdm: (params.marketingEdm ?? existing.marketingEdm) as boolean,
      },
      userObj
    );
  } else {
    await registry.mail.recipient.add(
      {
        email,
        scope: "user",
        userId,
        remoteLoginWarn: (params.remoteLoginWarn ?? true) as boolean,
        marketingEdm: (params.marketingEdm ?? true) as boolean,
      },
      userObj
    );
  }

  return { success: true };
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新当前用户邮件通知偏好",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "update" },
} satisfies API;

const service = {
  get: getApi,
  update: updateApi,
};

export default service;
