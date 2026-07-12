import {
  ProfileVO,
  ProfileListKeys,
  ProfileGetKeys,
  ProfileAddKeys,
  ProfileUpdateKeys,
  ProfileSortableKeys,
  type ProfilePOLike,
  type ProfileVOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { RequiredKeys } from "@hodor/core/types/app";
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
import type { UserObj } from "@hodor/core/types/app.js";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as profileRepository from "./repository";

//----------------- listAll ----------------//
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    userId: ProfileVO["userId"],
    orderBy: orderByWrapper<(keyof ProfilePOLike)[]>(ProfileSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...ProfileVO,
    },
    required: ["id", "userId", "realName", "creatorId", "createTimeUtc"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>,
  userObj: UserObj
): Promise<FromSchema<typeof listAllRes>> {
  const rows = await profileRepository.listAll(params);
  return rows;
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有个人信息记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

//----------------- list ----------------//
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    userId: ProfileVO["userId"],
    orderBy: orderByWrapper<(keyof ProfilePOLike)[]>(ProfileSortableKeys),
  },
  required: ["pageNo", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = listResponseWrapper(ProfileVO, ProfileListKeys);

async function onList(
  params: FromSchema<typeof listReq>,
  userObj: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { pageNo, pageSize, orderBy, descend, ...condition } = params as any;
  const result = await profileRepository.list(
    pageNo,
    pageSize,
    orderBy,
    descend,
    condition
  );

  return {
    total: result.total,
    totalPage: Math.ceil(result.total / pageSize),
    currentPage: pageNo,
    pageSize: pageSize,
    list: result.list as any,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "分页获取个人信息列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

//----------------- add ----------------//
const addReq = {
  type: "object",
  properties: {
    ...ProfileVO,
  },
  required: ProfileAddKeys as any,
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  type: "object",
  properties: {
    ...ProfileVO,
  },
  required: ProfileListKeys as any,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<any> {
  const row = await profileRepository.add(
    Object.assign({}, params as any, { creatorId: userObj.id })
  );
  return row as any;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "新增个人信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

//----------------- update ----------------//
const updateReq = {
  type: "object",
  properties: {
    ...ProfileVO,
  },
  required: ProfileUpdateKeys as any,
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = {
  type: "object",
  properties: {
    ...ProfileVO,
  },
  required: ProfileListKeys as any,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<any> {
  const { id, ...data } = params as any;
  const row = await profileRepository.update(
    id,
    Object.assign({}, data, { updaterId: userObj.id })
  );
  preventEmpty(row);
  return row as any;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "修改个人信息",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

//----------------- delete ----------------//
const deleteReq = {
  type: "object",
  properties: {
    id: ProfileVO["id"],
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  type: "object",
  properties: {
    ...ProfileVO,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes>> {
  const { id } = params;
  const row = await profileRepository.remove(id);
  preventEmpty(row);
  return row as any;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除个人信息记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

//----------------- get ----------------//
const getReq = {
  type: "object",
  properties: {
    id: ProfileVO["id"],
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...ProfileVO,
  },
  required: ProfileListKeys as any,
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>,
  userObj: UserObj
): Promise<any> {
  const { id } = params;
  const row = await profileRepository.get(id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取个人信息详情",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
