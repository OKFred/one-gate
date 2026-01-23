import db from "@/db/index";
import {
  regionTable,
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
        like(regionTable.labelZhCN, `%${keyword}%`),
        like(regionTable.labelEnUS, `%${keyword}%`),
        like(regionTable.alpha2Code, `%${keyword}%`),
        like(regionTable.alpha3Code, `%${keyword}%`)
      )
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(regionTable.isEnabled, isEnabled));
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
      labelZhCN: RegionVO.labelZhCN,
      labelEnUS: RegionVO.labelEnUS,
      alpha2Code: RegionVO.alpha2Code,
      alpha3Code: RegionVO.alpha3Code,
      numeric: RegionVO.numeric,
      iso3166Independent: RegionVO.iso3166Independent,
      isEnabled: RegionVO.isEnabled,
    },
    required: [...RegionGetKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = regionTable[orderBy] || regionTable.id;
  const maxLimit = 100_000;
  const rows = await db
    .select({
      id: regionTable.id,
      labelZhCN: regionTable.labelZhCN,
      labelEnUS: regionTable.labelEnUS,
      alpha2Code: regionTable.alpha2Code,
      alpha3Code: regionTable.alpha3Code,
      numeric: regionTable.numeric,
      iso3166Independent: regionTable.iso3166Independent,
      isEnabled: regionTable.isEnabled,
    })
    .from(regionTable)
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
    summary: "获取所有国家地区（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
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
  const offset = (pageNo - 1) * pageSize;
  const orderField = regionTable[orderBy] || regionTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(regionTable.id).as("total") })
    .from(regionTable)
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
    .from(regionTable)
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
    summary: "获取国家地区列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
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
  await uniqueCheck(params);
  const addData = {
    ...params,
    creatorId,
  };
  const result = await db
    .insert(regionTable)
    .values(addData)
    .returning({ id: regionTable.id });
  return result[0]?.id ?? null;
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
  await uniqueCheck(params, id);
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
    .update(regionTable)
    .set(updateData)
    .where(eq(regionTable.id, id))
    .returning({ id: regionTable.id });
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
    summary: "更新国家地区",
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
  const result = await db
    .delete(regionTable)
    .where(eq(regionTable.id, id))
    .returning({ id: regionTable.id });
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
    summary: "删除国家地区",
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
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = params;
  const rows = await db
    .select()
    .from(regionTable)
    .where(eq(regionTable.id, id))
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
    summary: "获取国家地区详情",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

async function uniqueCheck(
  obj: FromSchema<typeof updateReq | typeof addReq>,
  excludeId?: number
): Promise<void> {
  const conditions = [] as any[];
  if (hasValue(obj.alpha2Code)) {
    conditions.push(eq(regionTable.alpha2Code, obj.alpha2Code));
  }
  if (hasValue(obj.alpha3Code)) {
    conditions.push(eq(regionTable.alpha3Code, obj.alpha3Code));
  }
  if (hasValue(obj.numeric)) {
    conditions.push(eq(regionTable.numeric, obj.numeric));
  }
  if (conditions.length === 0) return;

  const whereClause =
    conditions.length === 1 ? conditions[0] : or(...conditions);
  const records = await db
    .select({ id: regionTable.id })
    .from(regionTable)
    .where(
      and(whereClause, excludeId ? ne(regionTable.id, excludeId) : undefined)
    )
    .limit(1);
  if (records.length > 0) {
    throw new BusinessError(BusinessErrorCode.DUPLICATE_DATA);
  }
}

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
