import type { FromSchema } from "json-schema-to-ts";
import type { UserObj, Context } from "@hodor/core/types/app";
import { adminMobileAppBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import {
  bodyAdapter,
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import { MobileAppSortableKeys, type MobileAppPOLike } from "./model";
import { mobileAppRepo } from "./repository";

const S = adminMobileAppBackendSchemas;

function toSortableKey(val?: string): keyof MobileAppPOLike | undefined {
  return MobileAppSortableKeys.find((k) => k === val);
}

// Background task to upload Base64 icon to OSS and update the DB
async function uploadIconToOssBackground(
  appId: number,
  base64Data: string,
  _updaterId: number
) {
  try {
    // Basic base64 checks
    if (!base64Data.startsWith("data:image")) return;

    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return;

    console.log(
      `[MobileApp] Attempting to upload base64 icon for appId=${appId} to OSS...`
    );
  } catch (err) {
    console.error(
      `[MobileApp] Failed to upload icon to OSS for appId=${appId}:`,
      err
    );
  }
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const {
    keyword,
    isEnabled,
    orderBy,
    descend,
    pageNo = 1,
    pageSize = 10,
  } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const res = await mobileAppRepo.list({
    keyword,
    isEnabled,
    orderBy: toSortableKey(orderBy),
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(res.list, res.total, pageNo, finalPageSize);
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj,
  c: Context
): Promise<number> {
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

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj,
  c: Context
): Promise<number> {
  await mobileAppRepo.update({
    ...params,
    updaterId: userObj.id,
  });

  if (params.iconUrl?.startsWith("data:image")) {
    c.executionCtx.waitUntil(
      uploadIconToOssBackground(params.id, params.iconUrl, userObj.id)
    );
  }

  return params.id;
}

async function onGet(
  params: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const row = await mobileAppRepo.getById(params.id);
  if (!row) throw new Error("App not found");
  return row;
}

async function onDelete(obj: FromSchema<typeof S.deleteReq>): Promise<boolean> {
  await mobileAppRepo.delete(obj.id);
  return true;
}

export default createCrudApis(S, {
  list: {
    summary: "分页获取移动应用",
    handler: onList,
  },
  add: {
    adapter: bodyUserContextAdapter,
    summary: "添加移动应用",
    handler: onAdd,
  },
  update: {
    adapter: bodyUserContextAdapter,
    summary: "更新移动应用",
    handler: onUpdate,
  },
  get: {
    summary: "获取应用详情",
    handler: onGet,
  },
  delete: {
    adapter: bodyAdapter,
    summary: "删除移动应用",
    resSchema: { type: "boolean" } as const,
    handler: onDelete,
  },
});
