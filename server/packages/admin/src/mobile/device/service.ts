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
  MobileDeviceVO,
  MobileDeviceAddVO,
  MobileDeviceUpdateVO,
  MobileDeviceAddKeys,
  MobileDeviceUpdateKeys,
  MobileDeviceDetailKeys,
  MobileDeviceListKeys,
  MobileDeviceSortableKeys,
} from "./model";
import { mobileDeviceRepo } from "./repository";

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MobileDeviceVO["isEnabled"],
    orderBy: orderByWrapper<(typeof MobileDeviceSortableKeys)[number][]>([
      ...MobileDeviceSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(MobileDeviceVO, [...MobileDeviceListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await mobileDeviceRepo.list({
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
  pathInfo: { path: "/list", method: "post", summary: "分页获取移动设备" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...MobileDeviceAddVO },
  required: [...MobileDeviceAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<number | null> {
  const existing = await mobileDeviceRepo.getByClientId(obj.clientId);
  if (existing) {
    throw new Error(`Device with clientId ${obj.clientId} already exists`);
  }
  return await mobileDeviceRepo.add({
    ...obj,
    deviceName: obj.deviceName ?? null,
    remark: obj.remark ?? null,
    creatorId: userObj.id,
  });
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加移动设备" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...MobileDeviceUpdateVO },
  required: [...MobileDeviceUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<void> {
  await mobileDeviceRepo.update({
    ...params,
    updaterId: userObj.id,
  });
}

const updateApi = {
  req: updateReq,
  res: addRes, // Returns id if we modify onUpdate to return id, or we can just return empty and use boolean
  pathInfo: { path: "/update", method: "post", summary: "更新移动设备" },
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
  const row = await mobileDeviceRepo.getById(params.id as number);
  if (!row) throw new Error("Device not found");
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...MobileDeviceVO },
    required: [...MobileDeviceDetailKeys],
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取设备详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  await mobileDeviceRepo.delete(obj.id as number);
  return true;
}

const deleteApi = {
  req: getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/delete", method: "post", summary: "删除移动设备" },
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
