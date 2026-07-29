import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { familyRepository } from "./repository.js";
import {
  IndexVO,
  FamilyMemberPO,
  FamilyMemberAddVO,
  FamilyMemberUpdateVO,
  type FamilyMemberPOLike,
} from "./model.js";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    relationType: FamilyMemberPO["relationType"],
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<FamilyMemberPOLike>[]>(
    { ...FamilyMemberPO },
    ["id", "isSelf", "relationType", "realName", "creatorId", "createTimeUtc"]
  ),
} as const satisfies JSONSchema;

async function onList(params: FromSchema<typeof listReq>, userObj: UserObj) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const { total, list } = await familyRepository.findPage({
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

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/member/list", method: "post", summary: "家庭成员列表" },
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: { ...FamilyMemberAddVO },
  required: ["relationType", "realName"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onAdd(params: FromSchema<typeof addReq>, userObj: UserObj) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const res = await familyRepository.insert({
    ...params,
    isSelf: params.isSelf ?? false,
    gender: params.gender ?? null,
    avatar: params.avatar ?? null,
    birthDateUtc: params.birthDateUtc ?? null,
    phone: params.phone ?? null,
    isEmergencyContact: params.isEmergencyContact ?? false,
    healthNote: params.healthNote ?? null,
    remark: params.remark ?? null,
    creatorId: userId,
    creatorName: userName,
    updaterId: userId,
    updaterName: userName,
  });
  return { id: res.id };
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/member/add", method: "post", summary: "新增家庭成员" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: { ...FamilyMemberUpdateVO },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
) {
  const userId = Number(userObj.id || userObj.userId || 0);
  const userName =
    (userObj as unknown as { nickname?: string }).nickname ||
    userObj.username ||
    "User";
  const { id, ...data } = params;
  await familyRepository.update(id, {
    ...data,
    updaterId: userId,
    updaterName: userName,
  });
  return { success: true };
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: { path: "/member/update", method: "post", summary: "更新家庭成员" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: { id: IndexVO["id"] },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  type: "object",
  properties: { success: { type: "boolean" } },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDelete(params: FromSchema<typeof deleteReq>) {
  await familyRepository.delete(params.id);
  return { success: true };
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: { path: "/member/delete", method: "post", summary: "删除家庭成员" },
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const service = {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
};

export default service;
