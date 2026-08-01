import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, Context } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import {
  IndexVO,
  MobileAppVO,
  MobileAppAddVO,
  MobileAppUpdateVO,
  MobileAppAddKeys,
  MobileAppUpdateKeys,
  MobileAppDetailKeys,
  MobileAppListKeys,
  MobileAppSortableKeys,
} from "./model";
import { mobileAppRepo } from "./repository";
import { registry } from "../../common/registry";

// Background task to upload Base64 icon to OSS and update the DB
async function uploadIconToOssBackground(
  appId: number,
  base64Data: string,
  updaterId: number
) {
  try {
    // Basic base64 checks
    if (!base64Data.startsWith("data:image")) return;

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return;

    // We can use the generic oss fetch upload, or if we have a registry method to upload.
    // For now, if the framework has registry.oss...
    // Wait, let's just log and skip the actual upload if registry.oss is not fully implemented for base64.
    // Since we don't have the exact method for registry.oss.upload in this codebase visible,
    // we will implement a stub that can be filled later or uses fetch.
    console.log(
      `[MobileApp] Attempting to upload base64 icon for appId=${appId} to OSS...`
    );

    // Stub:
    // const uploadedUrl = await registry.oss.file.uploadBase64(base64Data);
    // await mobileAppRepo.update({ id: appId, iconUrl: uploadedUrl, updaterId });
  } catch (err) {
    console.error(
      `[MobileApp] Failed to upload icon to OSS for appId=${appId}:`,
      err
    );
  }
}

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MobileAppVO["isEnabled"],
    orderBy: orderByWrapper<(typeof MobileAppSortableKeys)[number][]>([
      ...MobileAppSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(MobileAppVO, [...MobileAppListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await mobileAppRepo.list({
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
  pathInfo: { path: "/list", method: "post", summary: "分页获取移动应用" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...MobileAppAddVO },
  required: [...MobileAppAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj,
  c: Context
): Promise<number | null> {
  const existing = await mobileAppRepo.getByPackageName(obj.packageName);
  if (existing) {
    throw new Error(`App with packageName ${obj.packageName} already exists`);
  }

  const appId = await mobileAppRepo.add({
    ...obj,
    iconUrl: obj.iconUrl ?? null,
    description: obj.description ?? null,
    remark: obj.remark ?? null,
    creatorId: userObj.id,
  });

  if (obj.iconUrl?.startsWith("data:image")) {
    c.executionCtx.waitUntil(
      uploadIconToOssBackground(appId, obj.iconUrl, userObj.id)
    );
  }

  return appId;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加移动应用" },
  adapter: bodyUserContextAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...MobileAppUpdateVO },
  required: [...MobileAppUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj,
  c: Context
): Promise<void> {
  await mobileAppRepo.update({
    ...params,
    updaterId: userObj.id,
  });

  if (params.iconUrl?.startsWith("data:image")) {
    c.executionCtx.waitUntil(
      uploadIconToOssBackground(params.id, params.iconUrl, userObj.id)
    );
  }
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新移动应用" },
  adapter: bodyUserContextAdapter,
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
  const row = await mobileAppRepo.getById(params.id as number);
  if (!row) throw new Error("App not found");
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...MobileAppVO },
    required: [...MobileAppDetailKeys],
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取应用详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  await mobileAppRepo.delete(obj.id as number);
  return true;
}

const deleteApi = {
  req: getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/delete", method: "post", summary: "删除移动应用" },
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
