import {
  IndexVO,
  LanguageVO,
  LanguageListVO,
  LanguageAddVO,
  LanguageUpdateVO,
  LanguageListKeys,
  LanguageDetailKeys,
  LanguageGetKeys,
  LanguageDeleteKeys,
  LanguageAddKeys,
  LanguageUpdateKeys,
  LanguageSortableKeys,
  type LanguagePOLike,
  type LanguageVOLike,
  type LanguageAddVOLike,
  type LanguageUpdateVOLike,
  type LanguageDeleteVOLike,
  type LanguageGetVOLike,
} from "./model";
import * as languageRepository from "./repository";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";

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
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: LanguageVO["isEnabled"],
    orderBy: orderByWrapper<(keyof LanguagePOLike)[]>(LanguageSortableKeys),
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
      langCode: LanguageVO.langCode,
      nativeName: LanguageVO.nativeName,
      isEnabled: LanguageVO.isEnabled,
      sortOrder: LanguageVO.sortOrder,
    },
    required: [...LanguageGetKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await languageRepository.findPageAll(params);
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有语言（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: false, // 因为切换语言前需要获取语言列表
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: LanguageVO["isEnabled"],
    orderBy: orderByWrapper<(keyof LanguagePOLike)[]>(LanguageSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<LanguagePOLike>[]>(
    {
      ...LanguageListVO,
    },
    [...LanguageListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const {
    orderBy = "sortOrder",
    descend = false,
    pageNo = 1,
    pageSize = 10,
  } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await languageRepository.findPage({
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
    summary: "获取语言列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...LanguageAddVO,
  } satisfies Partial<Record<keyof LanguageAddVOLike, JSONSchema>>,
  required: [
    ...LanguageAddKeys,
  ] as const satisfies RequiredKeys<LanguageAddVOLike>[],
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
    creatorId,
  };
  return await languageRepository.onInsert(addData);
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加语言",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...LanguageUpdateVO,
  },
  required: [
    ...LanguageUpdateKeys,
  ] as const satisfies RequiredKeys<LanguageUpdateVOLike>[],
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
    updaterId,
    updateTimeUtc: Date.now(),
  };

  const row = await languageRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新语言",
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
    ...LanguageDeleteKeys,
  ] as const satisfies RequiredKeys<LanguageDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  const row = await languageRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除语言",
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
    ...LanguageGetKeys,
  ] as const satisfies RequiredKeys<LanguageGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...LanguageVO,
  },
  required: [
    ...LanguageDetailKeys,
  ] as const satisfies RequiredKeys<LanguageVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const { id } = params;
  const row = await languageRepository.findById(id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取语言详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function verifyLangCode(langCode: string): Promise<void> {
  const row = await languageRepository.findByLangCode({
    langCode,
    isEnabled: true,
  });
  preventEmpty(row);
}

async function verifyLangCodeUnique(langCode: string, excludeId?: number) {
  const row = await languageRepository.findByLangCode({
    langCode,
    excludeId,
  });
  return row === null;
}

export const utils = {
  verifyLangCode,
  verifyLangCodeUnique,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
