import type { FromSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminMobileAppVersionBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import type { MobileAppVersionPOLike } from "./model";
import { mobileAppVersionRepo } from "./repository";

const S = adminMobileAppVersionBackendSchemas;

const SORTABLE_FIELDS: ReadonlySet<keyof MobileAppVersionPOLike> = new Set([
  "id",
  "appId",
  "versionName",
  "versionCode",
  "isForced",
  "isEnabled",
  "createTimeUtc",
]);

function mapAppVersionRow(row: MobileAppVersionPOLike) {
  return {
    id: row.id,
    appId: row.appId,
    versionCode: row.versionCode,
    versionName: row.versionName,
    apkUrl: row.apkUrl,
    releaseNotes: row.releaseNotes ?? null,
    isForced: row.isForced,
    isEnabled: row.isEnabled,
    createTimeUtc: row.createTimeUtc,
    remark: row.remark ?? null,
    creatorId: row.creatorId,
    updaterId: row.updaterId ?? null,
    updateTimeUtc: row.updateTimeUtc ?? null,
  };
}

// 列表 (分页)
async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const pageNo = params.pageNo ?? 1;
  const pageSize = params.pageSize ?? 10;
  const orderBy =
    params.orderBy &&
    SORTABLE_FIELDS.has(params.orderBy as keyof MobileAppVersionPOLike)
      ? (params.orderBy as keyof MobileAppVersionPOLike)
      : undefined;

  const res = await mobileAppVersionRepo.list({
    appId: params.appId,
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy,
    descend: params.descend,
    pageNo,
    pageSize,
  });

  return buildPagedListResult(
    res.list.map(mapAppVersionRow),
    res.total,
    pageNo,
    pageSize
  );
}

// 新增
async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number> {
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

// 更新
async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  await mobileAppVersionRepo.update({
    ...params,
    updaterId: userObj.id,
  });
  return params.id;
}

// 获取详情
async function onGet(
  params: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const row = await mobileAppVersionRepo.getById(params.id);
  if (!row) throw new Error("Version not found");
  return mapAppVersionRow(row);
}

// 删除
async function onDelete(obj: FromSchema<typeof S.deleteReq>): Promise<number> {
  await mobileAppVersionRepo.delete(obj.id);
  return obj.id;
}

export default createCrudApis(S, {
  list: { summary: "获取应用版本列表", handler: onList },
  add: { summary: "登记新版本", handler: onAdd },
  update: { summary: "更新应用版本", handler: onUpdate },
  get: { summary: "获取版本详情", handler: onGet },
  delete: { summary: "删除应用版本", handler: onDelete },
});
