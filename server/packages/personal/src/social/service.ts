import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { socialRepository } from "./repository.js";
import {
  IndexVO,
  SocialContactPO,
  SocialContactAddVO,
  SocialContactUpdateVO,
  SocialRelationPO,
  type SocialContactPOLike,
} from "./model.js";

const contactListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    relationCircle: SocialContactPO["relationCircle"],
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const contactListRes = {
  ...listResponseWrapper<RequiredKeys<SocialContactPOLike>[]>(
    { ...SocialContactPO },
    [
      "id",
      "realName",
      "relationCircle",
      "intimacyLevel",
      "creatorId",
      "createTimeUtc",
    ]
  ),
} as const satisfies JSONSchema;

async function onContactList(
  params: FromSchema<typeof contactListReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const { total, list } = await socialRepository.findContactPage({
    ...params,
    creatorId: userId,
  });
  const totalPage = Math.ceil(total / (params.pageSize || 10));
  return {
    total,
    totalPage,
    currentPage: params.pageNo || 1,
    pageSize: params.pageSize || 10,
    list,
  };
}

const contactListApi = {
  req: contactListReq,
  res: contactListRes,
  pathInfo: { path: "/contact/list", method: "post", summary: "联系人列表" },
  adapter: bodyUserAdapter,
  service: onContactList,
  permission: { action: "read" },
} satisfies API;

const contactAddReq = {
  type: "object",
  properties: { ...SocialContactAddVO },
  required: ["realName", "relationCircle"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const contactAddRes = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onContactAdd(
  params: FromSchema<typeof contactAddReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const res = await socialRepository.insertContact({
    ...params,
    company: params.company ?? null,
    position: params.position ?? null,
    phone: params.phone ?? null,
    email: params.email ?? null,
    avatar: params.avatar ?? null,
    intimacyLevel: params.intimacyLevel ?? 3,
    remark: params.remark ?? null,
    creatorId: userId,
    creatorName: userName,
    updaterId: userId,
    updaterName: userName,
  });
  return { id: res.id };
}

const contactAddApi = {
  req: contactAddReq,
  res: contactAddRes,
  pathInfo: { path: "/contact/add", method: "post", summary: "新增联系人" },
  adapter: bodyUserAdapter,
  service: onContactAdd,
  permission: { action: "add" },
} satisfies API;

const contactUpdateReq = {
  type: "object",
  properties: { ...SocialContactUpdateVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const contactUpdateRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onContactUpdate(
  params: FromSchema<typeof contactUpdateReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const { id, ...data } = params;
  await socialRepository.updateContact(id, {
    ...data,
    updaterId: userId,
    updaterName: userName,
  });
  return { success: true };
}

const contactUpdateApi = {
  req: contactUpdateReq,
  res: contactUpdateRes,
  pathInfo: { path: "/contact/update", method: "post", summary: "更新联系人" },
  adapter: bodyUserAdapter,
  service: onContactUpdate,
  permission: { action: "edit" },
} satisfies API;

const contactDeleteReq = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const contactDeleteRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onContactDelete(params: FromSchema<typeof contactDeleteReq>) {
  await socialRepository.deleteContact(params.id);
  return { success: true };
}

const contactDeleteApi = {
  req: contactDeleteReq,
  res: contactDeleteRes,
  pathInfo: { path: "/contact/delete", method: "post", summary: "删除联系人" },
  adapter: bodyUserAdapter,
  service: onContactDelete,
  permission: { action: "delete" },
} satisfies API;

// Graph / Network Topology
const graphReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

const graphRes = {
  type: "object",
  properties: {
    contacts: {
      type: "array",
      items: {
        type: "object",
        properties: { ...SocialContactPO },
      },
    },
    relations: {
      type: "array",
      items: {
        type: "object",
        properties: { ...SocialRelationPO },
      },
    },
  },
  required: ["contacts", "relations"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGraph(_params: FromSchema<typeof graphReq>, userObj: UserObj) {
  const userId = Number(userObj.id || userObj.userId || 0);
  return await socialRepository.getGraphData(userId);
}

const graphApi = {
  req: graphReq,
  res: graphRes,
  pathInfo: { path: "/graph", method: "post", summary: "获取社交网络拓扑数据" },
  adapter: bodyUserAdapter,
  service: onGraph,
  permission: { action: "read" },
} satisfies API;

const service = {
  contactList: contactListApi,
  contactAdd: contactAddApi,
  contactUpdate: contactUpdateApi,
  contactDelete: contactDeleteApi,
  graph: graphApi,
};

export default service;
