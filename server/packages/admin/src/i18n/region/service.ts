import * as regionRepository from "./repository";
import type { FromSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminI18nRegionBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";

const S = adminI18nRegionBackendSchemas;

async function onListAll(
  params: FromSchema<typeof S.listAllReq>
): Promise<FromSchema<typeof S.listAllRes>> {
  return await regionRepository.findPageAll(params);
}

async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await regionRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    keyword: params.keyword,
    isEnabled: params.isEnabled,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
  userObj: Pick<UserObj, "userId">
): Promise<number> {
  const { userId: creatorId } = userObj;

  const addData = {
    labels: (params.labels ?? null) as { [key: string]: string } | null,
    alpha2Code: params.alpha2Code,
    alpha3Code: params.alpha3Code,
    numeric: params.numeric,
    iso3166Independent: params.iso3166Independent,
    businessLanguages: params.businessLanguages ?? null,
    isEnabled: params.isEnabled,
    remark: params.remark ?? null,
    creatorId,
  };
  return await regionRepository.onInsert(addData);
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;
  await onGet({ id }); // 若记录不存在则由 preventEmpty 抛出
  const updateData = {
    ...rest,
    labels: rest.labels as { [key: string]: string } | undefined,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  const row = await regionRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
}

async function onDelete(
  params: FromSchema<typeof S.deleteReq>
): Promise<number> {
  const { id } = params;
  const row = await regionRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}

async function onGet(
  params: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = params;
  const row = await regionRepository.findById(id);
  preventEmpty(row);
  return row;
}

/** 验证国家地区是否存在且可用 */
async function verifyRegion(regionId: number): Promise<void> {
  const regionData = await onGet({ id: regionId });
  if (!regionData.isEnabled) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
}

async function verifyRegionCodeUnique(
  obj: {
    alpha2Code?: string | null;
    alpha3Code?: string | null;
    numeric?: number | null;
  },
  excludeId?: number
) {
  const record = await regionRepository.findByCodes({
    alpha2Code: obj.alpha2Code,
    alpha3Code: obj.alpha3Code,
    numeric: obj.numeric,
    excludeId,
  });
  return record === null;
}

export const utils = {
  verifyRegion,
  verifyRegionCodeUnique,
};

export default createCrudApis(S, {
  listAll: { summary: "获取所有国家地区（不分页）", handler: onListAll },
  list: { summary: "获取国家地区列表", handler: onList },
  add: { summary: "添加国家地区", handler: onAdd },
  update: { summary: "更新国家地区", handler: onUpdate },
  delete: { summary: "删除国家地区", handler: onDelete },
  get: { summary: "获取国家地区详情", handler: onGet },
});
