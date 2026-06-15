import {
  IndexVO,
  RegionVO,
  RegionListVO,
  RegionAddVO,
  RegionUpdateVO,
  RegionListKeys,
  RegionDetailKeys,
  RegionGetKeys,
  RegionDeleteKeys,
  RegionAddKeys,
  RegionUpdateKeys,
  RegionSortableKeys,
  type RegionPOLike,
  type RegionVOLike,
  type RegionAddVOLike,
  type RegionUpdateVOLike,
  type RegionDeleteVOLike,
  type RegionGetVOLike,
} from "./model";
import * as regionRepository from "./repository";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";

import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import { preventEmpty } from "@/middleware/auth/prevention";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: RegionVO["isEnabled"],
    orderBy: orderByWrapper<(keyof RegionPOLike)[]>(RegionSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: IndexVO.id,
      labels: RegionVO.labels,
      alpha2Code: RegionVO.alpha2Code,
      alpha3Code: RegionVO.alpha3Code,
      numeric: RegionVO.numeric,
      iso3166Independent: RegionVO.iso3166Independent,
      businessLanguages: RegionVO.businessLanguages,
      isEnabled: RegionVO.isEnabled,
    },
    required: [...RegionGetKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await regionRepository.findPageAll(params);
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有国家地区（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: RegionVO["isEnabled"],
    orderBy: orderByWrapper<(keyof RegionPOLike)[]>(RegionSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<RegionPOLike>[]>(
    {
      ...RegionListVO,
    },
    [...RegionListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
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

  const totalPage = finalPageSize === 0 ? 0 : Math.ceil(total / finalPageSize);
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
    summary: "获取国家地区列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...RegionAddVO,
  } satisfies Partial<Record<keyof RegionAddVOLike, JSONSchema>>,
  required: [
    ...RegionAddKeys,
  ] as const satisfies RequiredKeys<RegionAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onAdd(
  params: FromSchema<typeof addReq>,
  userObj: Pick<UserObj, "userId">
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;

  const addData = {
    ...params,
    labels: params.labels as { [key: string]: string },
    creatorId,
  };
  return await regionRepository.onInsert(addData);
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加国家地区",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...RegionUpdateVO,
  },
  required: [
    ...RegionUpdateKeys,
  ] as const satisfies RequiredKeys<RegionUpdateVOLike>[],
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

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新国家地区",
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
    ...RegionDeleteKeys,
  ] as const satisfies RequiredKeys<RegionDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  const row = await regionRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除国家地区",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...RegionGetKeys,
  ] as const satisfies RequiredKeys<RegionGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...RegionVO,
  },
  required: [
    ...RegionDetailKeys,
  ] as const satisfies RequiredKeys<RegionVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const { id } = params;
  const row = await regionRepository.findById(id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取国家地区详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

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

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
