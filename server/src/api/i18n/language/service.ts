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
  LanguageSortableKeys,
  type LanguagePOLike,
  type LanguageVOLike,
  type LanguageAddVOLike,
  type LanguageUpdateVOLike,
  type LanguageDeleteVOLike,
  type LanguageGetVOLike,
} from "./db.table";
import { asc, count, desc, eq, or, like, and, ne } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
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

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
}: Pick<FromSchema<typeof listReq>, "keyword" | "isEnabled">) => {
  const conditions = [] as any[];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(languageTable.langCode, `%${keyword}%`),
        like(languageTable.nativeName, `%${keyword}%`)
      )
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(languageTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

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
  const { orderBy = "sortOrder", descend = false } = params;
  const orderField = languageTable[orderBy] || languageTable.sortOrder;
  const maxLimit = 100_000;
  const rows = await db
    .select({
      id: languageTable.id,
      langCode: languageTable.langCode,
      nativeName: languageTable.nativeName,
      isEnabled: languageTable.isEnabled,
      sortOrder: languageTable.sortOrder,
    })
    .from(languageTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
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
  const offset = (pageNo - 1) * pageSize;
  const orderField = languageTable[orderBy] || languageTable.sortOrder;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(languageTable.id).as("total") })
    .from(languageTable)
    .where(buildWhereCondition(params));
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

  const rows = await db
    .select()
    .from(languageTable)
    .where(buildWhereCondition(params))
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
    summary: "获取语言列表",
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
  userObj: Pick<UserObj, "userId">
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  await uniqueCheck(params);

  const addData = {
    ...params,
    creatorId,
  };
  const result = await db
    .insert(languageTable)
    .values(addData)
    .returning({ id: languageTable.id });
  return result[0]?.id ?? null;
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
  await uniqueCheck(params);
  const previousRecord = await onGet({ id });
  if (!previousRecord) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  const updateData = {
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
    summary: "更新语言",
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
    summary: "删除语言",
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
    summary: "获取语言详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

async function uniqueCheck(
  obj: FromSchema<typeof updateReq | typeof addReq>
): Promise<void> {
  if (hasValue(obj.langCode)) {
    const records = await db
      .select({ id: languageTable.id })
      .from(languageTable)
      .where(
        and(
          eq(languageTable.langCode, obj.langCode),
          "id" in obj ? ne(languageTable.id, obj.id) : undefined
        )
      )
      .limit(1);
    if (records.length > 0) {
      throw new BusinessError(BusinessErrorCode.DUPLICATE_DATA);
    }
  }
}

async function verifyLangCode(langCode: string): Promise<void> {
  const record = await db
    .select({ id: languageTable.id })
    .from(languageTable)
    .where(
      and(
        eq(languageTable.langCode, langCode),
        eq(languageTable.isEnabled, true)
      )
    )
    .limit(1);
  if (record.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
}

export const utils = {
  verifyLangCode,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
