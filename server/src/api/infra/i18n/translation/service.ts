import {
  IndexVO,
  TranslationVO,
  TranslationListVO,
  TranslationAddVO,
  TranslationUpdateVO,
  TranslationListKeys,
  TranslationDetailKeys,
  TranslationGetKeys,
  TranslationDeleteKeys,
  TranslationAddKeys,
  TranslationUpdateKeys,
  TranslationSortableKeys,
  type TranslationPOLike,
  type TranslationVOLike,
  type TranslationAddVOLike,
  type TranslationUpdateVOLike,
  type TranslationDeleteVOLike,
  type TranslationGetVOLike,
} from "./model";
import * as translationRepository from "./repository";
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
import { preventEmpty } from "@/middleware/auth/prevention";

import { kv } from "@/middleware/cache";

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    application: TranslationVO["application"],
    business: TranslationVO["business"],
    langCode: TranslationVO["langCode"],
    isEnabled: TranslationVO["isEnabled"],
    orderBy: orderByWrapper<(keyof TranslationPOLike)[]>(
      TranslationSortableKeys
    ),
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
      application: TranslationVO.application,
      business: TranslationVO.business,
      langCode: TranslationVO.langCode,
      tKey: TranslationVO.tKey,
      tValue: TranslationVO.tValue,
      isEnabled: TranslationVO.isEnabled,
    },
    required: [...TranslationGetKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await translationRepository.findPageAll(params);
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有多语言翻译（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    application: TranslationVO["application"],
    business: TranslationVO["business"],
    langCode: TranslationVO["langCode"],
    isEnabled: TranslationVO["isEnabled"],
    orderBy: orderByWrapper<(keyof TranslationPOLike)[]>(
      TranslationSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<TranslationPOLike>[]>(
    {
      ...TranslationListVO,
    },
    [...TranslationListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await translationRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy,
    descend,
    keyword: params.keyword,
    application: params.application,
    business: params.business,
    langCode: params.langCode,
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
    summary: "获取多语言翻译列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...TranslationAddVO,
  } satisfies Partial<Record<keyof TranslationAddVOLike, JSONSchema>>,
  required: [
    ...TranslationAddKeys,
  ] as const satisfies RequiredKeys<TranslationAddVOLike>[],
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
  const transId = await translationRepository.onInsert(addData);

  // 如果是后端应用，同步更新 KV 缓存
  if (params.application === "backend") {
    await cacheSync(params, "add");
  }

  return transId;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加多语言翻译",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...TranslationUpdateVO,
  },
  required: [
    ...TranslationUpdateKeys,
  ] as const satisfies RequiredKeys<TranslationUpdateVOLike>[],
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
  const previousRecord = await onGet({ id }); // 若记录不存在则由 preventEmpty 抛出

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  const row = await translationRepository.onUpdate(id, updateData);
  preventEmpty(row);

  // 如果涉及后端文案，同步更新 KV 缓存
  if (
    params.application === "backend" ||
    previousRecord.application === "backend"
  ) {
    const current = await onGet({ id });
    if (current.application === "backend") {
      await cacheSync(current, "update");
    } else {
      await cacheSync(current, "delete");
    }
  }
  const updateRow = row;
  preventEmpty(updateRow);
  return updateRow.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新多语言翻译",
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
    ...TranslationDeleteKeys,
  ] as const satisfies RequiredKeys<TranslationDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = params;
  // 先取出记录（若不存在则 preventEmpty 抛出），用于删除后的缓存同步
  const record = await onGet({ id });
  const row = await translationRepository.onDelete(id);
  preventEmpty(row);
  // 获取删除前的信息以更新 KV
  if (record.application === "backend") {
    await cacheSync(record, "delete");
  }

  return row.id;
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除多语言翻译",
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
    ...TranslationGetKeys,
  ] as const satisfies RequiredKeys<TranslationGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...TranslationVO,
  },
  required: [
    ...TranslationDetailKeys,
  ] as const satisfies RequiredKeys<TranslationVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const { id } = params;
  const row = await translationRepository.findById(id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取多语言翻译",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

async function getTranslationsByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  return await translationRepository.findTranslationsByIds(ids);
}

// 检查重复文案
const checkDuplicateReq = {
  type: "object",
  properties: {
    tValue: TranslationVO.tValue,
    valueHash: TranslationVO.valueHash,
    excludeId: {
      ...IndexVO.id,
      description: "要排除的记录 ID（可选）",
      type: ["number", "null"],
      nullable: true,
    },
  },
  required: ["tValue", "valueHash"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const checkDuplicateRes = {
  type: "object",
  properties: {
    hasDuplicate: { type: "boolean", description: "是否有重复" },
    duplicates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: IndexVO.id,
          application: TranslationVO.application,
          business: TranslationVO.business,
          langCode: TranslationVO.langCode,
          tKey: TranslationVO.tKey,
          tValue: TranslationVO.tValue,
          isEnabled: TranslationVO.isEnabled,
        },
      },
    },
  },
  required: ["hasDuplicate", "duplicates"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onCheckDuplicate(
  params: FromSchema<typeof checkDuplicateReq>
): Promise<FromSchema<typeof checkDuplicateRes>> {
  const { tValue, valueHash, excludeId } = params;
  const rows = await translationRepository.findDuplicates({
    valueHash,
    excludeId: excludeId || undefined,
  });
  const filteredRows = rows.filter((row) => row.tValue === tValue);
  return {
    hasDuplicate: filteredRows.length > 0,
    duplicates: filteredRows,
  };
}

const checkDuplicateApi = {
  req: checkDuplicateReq,
  res: checkDuplicateRes,
  pathInfo: {
    path: "/checkDuplicate",
    method: "post",
    summary: "检查是否有重复的翻译文案",
  } as const,
  adapter: bodyAdapter,
  service: onCheckDuplicate,
  permission: { action: "read" },
} satisfies API;

/** SHA256 哈希计算 */
async function calculateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function cacheSync(
  record: FromSchema<typeof addReq>,
  operation: "add" | "update" | "delete"
) {
  const cacheKey = `i18n.translation:${record.langCode}.${record.tKey}`;
  if (operation === "add") {
    if (record.application !== "backend") return;
    await kv.put(cacheKey, record.tValue);
  } else if (operation === "update") {
    if (record.application !== "backend") return;
    await kv.put(cacheKey, record.tValue);
  } else if (operation === "delete") {
    await kv.delete(cacheKey);
  }
}

async function verifyTKeyUnique(
  obj: { tKey?: string; langCode?: string },
  excludeId?: number
) {
  const row = await translationRepository.findByKeyAndLang({
    tKey: obj.tKey!,
    langCode: obj.langCode!,
    excludeId,
  });
  return row === null;
}

export const utils = {
  getTranslationsByIds,
  calculateSHA256,
  verifyTKeyUnique,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  checkDuplicate: checkDuplicateApi,
};
