import {
  IndexVO,
  MailAccountVO,
  MailAccountListVO,
  MailAccountAddVO,
  MailAccountUpdateVO,
  MailAccountListKeys,
  MailAccountDetailKeys,
  MailAccountGetKeys,
  MailAccountDeleteKeys,
  MailAccountAddKeys,
  MailAccountUpdateKeys,
  MailAccountSortableKeys,
  type MailAccountPOLike,
  type MailAccountVOLike,
  type MailAccountAddVOLike,
  type MailAccountUpdateVOLike,
  type MailAccountDeleteVOLike,
  type MailAccountGetVOLike,
  MailAccountBaseVO,
  MailAccountUniqueKeys,
  MailAccountUniqueVO,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as mailAccountRepository from "./repository";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: MailAccountVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailAccountPOLike)[]>(
      MailAccountSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...IndexVO,
      ...MailAccountBaseVO,
      ...MailAccountUniqueVO,
    },
    required: [...MailAccountGetKeys, ...MailAccountUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await mailAccountRepository.findPageAll(params);
}
const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有邮件账户（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MailAccountVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailAccountPOLike)[]>(
      MailAccountSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MailAccountPOLike>[]>(
    {
      ...MailAccountListVO,
    },
    [...MailAccountListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await mailAccountRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}
const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取邮件账户列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailAccountAddVO,
  } satisfies Partial<Record<keyof MailAccountAddVOLike, JSONSchema>>,
  required: [
    ...MailAccountAddKeys,
  ] as const satisfies RequiredKeys<MailAccountAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const { password: base64Password, ...rest } = obj;
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const addData = {
    ...rest,
    password: plainPassword,
    creatorId,
  };
  const insertedId = await mailAccountRepository.onInsert(addData);
  return insertedId || null;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件账户",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MailAccountUpdateVO,
  },
  required: [
    ...MailAccountUpdateKeys,
  ] as const satisfies RequiredKeys<MailAccountUpdateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const { userId: updaterId } = userObj;
  const { id, isEnabled, password: base64Password, ...rest } = params;
  const plainPassword = base64Password
    ? Buffer.from(base64Password, "base64").toString("utf-8")
    : undefined;

  const updateData = {
    ...rest,
    password: plainPassword,
    updaterId,
    updateTimeUtc: Date.now(),
    isEnabled: isEnabled !== undefined ? isEnabled : undefined,
  };

  const row = await mailAccountRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新邮件账户",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...MailAccountDeleteKeys,
  ] as const satisfies RequiredKeys<MailAccountDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  obj: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = obj;
  const row = await mailAccountRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除邮件账户",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...MailAccountGetKeys,
  ] as const satisfies RequiredKeys<MailAccountGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MailAccountVO,
  },
  required: [
    ...MailAccountDetailKeys,
  ] as const satisfies RequiredKeys<MailAccountVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const row = await mailAccountRepository.findById(id);
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取邮件账户",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function getMailAccountsByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  return await mailAccountRepository.getMailAccountsByIds(ids);
}

export const utils = {
  getMailAccountsByIds,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
