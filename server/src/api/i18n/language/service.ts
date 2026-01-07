import db from "@/db/index";
import {
  languageTable,
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
  type LanguagePOLike,
  type LanguageVOLike,
  type LanguageAddVOLike,
  type LanguageUpdateVOLike,
  type LanguageDeleteVOLike,
  type LanguageGetVOLike,
} from "./db.table";
import { asc, count, desc, eq, or, like, inArray, and, ne } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyAdapter, bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    orderBy: orderByWrapper<(keyof LanguagePOLike)[]>([
      "id",
      "namespace",
      "langCode",
      "tKey",
      "createTimeUtc",
    ]),
    namespace: { type: "string", description: "命名空间过滤" },
    langCode: { type: "string", description: "语言代码过滤" },
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
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
    namespace,
    langCode,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = languageTable[orderBy] || languageTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 构建查询条件
  const buildWhereCondition = () => {
    const conditions = [];
    if (hasValue(keyword)) {
      conditions.push(
        or(
          like(languageTable.tKey, `%${keyword}%`),
          like(languageTable.tValue, `%${keyword}%`),
          like(languageTable.description, `%${keyword}%`)
        )
      );
    }
    if (hasValue(namespace)) {
      conditions.push(eq(languageTable.namespace, namespace));
    }
    if (hasValue(langCode)) {
      conditions.push(eq(languageTable.langCode, langCode));
    }
    return conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : and(...conditions)
      : undefined;
  };

  // 查询总数
  const countResult = await db
    .select({ total: count(languageTable.id).as("total") })
    .from(languageTable)
    .where(buildWhereCondition());
  const total = countResult[0]?.total || 0;
  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }
  // 查询列表数据
  const rows = await db
    .select()
    .from(languageTable)
    .where(buildWhereCondition())
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(finalPageSize)
    .offset(offset);
  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
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
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  // 检查 tKey 是否与其他记录冲突
  await uniqueCheck(params);
  const updateData = {
    ...params,
    creatorId,
  };
  const result = await db
    .insert(languageTable)
    .values(updateData)
    .returning({ id: languageTable.id });

  return result[0]?.id;
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
  // 检查 tKey 是否与其他记录冲突
  await uniqueCheck(params);
  let updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(languageTable)
    .set(updateData)
    .where(eq(languageTable.id, id))
    .returning({ id: languageTable.id });
  if (!res || res.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return res[0].id;
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
  const result = await db
    .delete(languageTable)
    .where(eq(languageTable.id, id))
    .returning({ id: languageTable.id });
  if (!result || result.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return result[0].id;
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
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(languageTable)
    .where(eq(languageTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  return rows[0];
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
} satisfies API;

async function getTranslationsByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ value: languageTable.id, label: languageTable.tKey })
    .from(languageTable)
    .where(inArray(languageTable.id, ids));
  return rows;
}

// 检查重复文案
const checkDuplicateReq = {
  type: "object",
  properties: {
    tValue: {
      type: "string",
      description: "翻译值",
    },
    valueHash: {
      type: "string",
      description: "值的SHA256哈希",
    },
    excludeId: {
      type: ["number", "null"],
      nullable: true,
      description: "排除的ID（编辑时使用）",
    },
  },
  required: ["valueHash"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const checkDuplicateRes = {
  type: "object",
  properties: {
    hasDuplicate: { type: "boolean" },
    duplicates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          namespace: { type: "string" },
          langCode: { type: "string" },
          tKey: { type: "string" },
          tValue: { type: "string" },
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

  const whereCondition = excludeId
    ? and(
        eq(languageTable.valueHash, valueHash),
        ne(languageTable.id, excludeId)
      )
    : eq(languageTable.valueHash, valueHash);

  const rows = await db
    .select({
      id: languageTable.id,
      namespace: languageTable.namespace,
      langCode: languageTable.langCode,
      tKey: languageTable.tKey,
      tValue: languageTable.tValue,
    })
    .from(languageTable)
    .where(whereCondition);
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
} satisfies API;

async function uniqueCheck(obj: FromSchema<typeof updateReq | typeof addReq>) {
  if (hasValue(obj.tKey)) {
    const existingRecord = await db
      .select({ id: languageTable.id })
      .from(languageTable)
      .where(
        and(
          eq(languageTable.tKey, obj.tKey),
          eq(languageTable.langCode, obj.langCode),
          "id" in obj ? ne(languageTable.id, obj.id) : undefined
        )
      )
      .limit(1);
    if (existingRecord.length > 0) {
      throw new BusinessError(BusinessErrorCode.DUPLICATE_KEYS, {
        tKey: obj.tKey,
        langCode: obj.langCode,
      });
    }
  }
}

export const utils = {
  getTranslationsByIds,
};

export default {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  checkDuplicate: checkDuplicateApi,
};
