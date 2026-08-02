import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  IndexVO,
  MobileAppVersionVO,
  MobileAppVersionAddVO,
  MobileAppVersionUpdateVO,
  MobileAppVersionAddKeys,
  MobileAppVersionUpdateKeys,
  MobileAppVersionDetailKeys,
  MobileAppVersionListKeys,
  MobileAppVersionSortableKeys,
} from "./model";
import { mobileAppVersionRepo } from "./repository";

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    appId: { type: "integer" },
    isEnabled: MobileAppVersionVO["isEnabled"],
    orderBy: orderByWrapper<(typeof MobileAppVersionSortableKeys)[number][]>([
      ...MobileAppVersionSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(MobileAppVersionVO, [...MobileAppVersionListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await mobileAppVersionRepo.list({
    appId: params.appId,
    keyword: (params as { keyword?: string }).keyword,
    isEnabled: params.isEnabled,
    orderBy: params.orderBy as any,
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list as unknown as FromSchema<typeof listRes>["list"],
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "获取应用版本列表" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...MobileAppVersionAddVO },
  required: [...MobileAppVersionAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<number | null> {
  const existing = await mobileAppVersionRepo.getByAppIdAndVersionCode(
    obj.appId,
    obj.versionCode
  );
  if (existing) {
    throw new Error(
      `Version ${obj.versionCode} already exists for appId ${obj.appId}`
    );
  }
  return await mobileAppVersionRepo.add({
    ...obj,
    releaseNotes: obj.releaseNotes ?? null,
    remark: obj.remark ?? null,
    creatorId: userObj.id,
  });
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "登记新版本" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...MobileAppVersionUpdateVO },
  required: [...MobileAppVersionUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<void> {
  await mobileAppVersionRepo.update({
    ...params,
    updaterId: userObj.id,
  });
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新应用版本" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 获取详情
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: ["id"],
} as const satisfies JSONSchema;

async function onGet(params: FromSchema<typeof getReq>) {
  const row = await mobileAppVersionRepo.getById(params.id as number);
  if (!row) throw new Error("Version not found");
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...MobileAppVersionVO },
    required: [...MobileAppVersionDetailKeys],
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取版本详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  await mobileAppVersionRepo.delete(obj.id as number);
  return true;
}

const deleteApi = {
  req: getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/delete", method: "post", summary: "删除应用版本" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  get: getApi,
  delete: deleteApi,
};
