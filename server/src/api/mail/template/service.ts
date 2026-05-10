import db from "@/db/index";
import {
  mailTemplateTable,
  IndexVO,
  MailTemplateVO,
  MailTemplateListVO,
  MailTemplateAddVO,
  MailTemplateUpdateVO,
  MailTemplateListKeys,
  MailTemplateDetailKeys,
  MailTemplateGetKeys,
  MailTemplateDeleteKeys,
  MailTemplateAddKeys,
  MailTemplateUpdateKeys,
  MailTemplateSortableKeys,
  type MailTemplatePOLike,
  type MailTemplateVOLike,
  type MailTemplateAddVOLike,
  type MailTemplateUpdateVOLike,
  type MailTemplateDeleteVOLike,
  type MailTemplateGetVOLike,
  MailTemplateBaseVO,
  MailTemplateUniqueKeys,
  MailTemplateUniqueVO,
} from "./model";
import { asc, count, desc, eq, or, like, and } from "drizzle-orm";
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
import { preventEmpty } from "@/middleware/auth/prevention";

// 构建查询条件(列表和全部通用)
const buildWhereCondition = ({
  keyword,
  isEnabled,
}: Pick<FromSchema<typeof listReq>, "keyword" | "isEnabled">) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(mailTemplateTable.name, `%${keyword}%`),
        like(mailTemplateTable.title, `%${keyword}%`),
        like(mailTemplateTable.category, `%${keyword}%`)
      )
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(mailTemplateTable.isEnabled, isEnabled));
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
    isEnabled: MailTemplateVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailTemplatePOLike)[]>(
      MailTemplateSortableKeys
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
      ...IndexVO,
      ...MailTemplateBaseVO,
      ...MailTemplateUniqueVO,
    },
    required: [...MailTemplateGetKeys, ...MailTemplateUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = mailTemplateTable[orderBy] || mailTemplateTable.id;
  const maxLimit = 10000;
  const rows = await db
    .select({
      id: mailTemplateTable.id,
      name: mailTemplateTable.name,
      title: mailTemplateTable.title,
      langCode: mailTemplateTable.langCode,
      content: mailTemplateTable.content,
      category: mailTemplateTable.category,
      isEnabled: mailTemplateTable.isEnabled,
    })
    .from(mailTemplateTable)
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
    summary: "获取所有邮件模板（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MailTemplateVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailTemplatePOLike)[]>(
      MailTemplateSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MailTemplatePOLike>[]>(
    {
      ...MailTemplateListVO,
    },
    [...MailTemplateListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailTemplateTable[orderBy] || mailTemplateTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(mailTemplateTable.id).as("total") })
    .from(mailTemplateTable)
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
    .from(mailTemplateTable)
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
    summary: "获取邮件模板列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailTemplateAddVO,
  } satisfies Partial<Record<keyof MailTemplateAddVOLike, JSONSchema>>,
  required: [
    ...MailTemplateAddKeys,
  ] as const satisfies RequiredKeys<MailTemplateAddVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;
  const addData = {
    ...obj,
    creatorId,
  };
  const result = await db
    .insert(mailTemplateTable)
    .values(addData)
    .returning({ id: mailTemplateTable.id });

  return result[0]?.id;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件模板",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MailTemplateUpdateVO,
  },
  required: [
    ...MailTemplateUpdateKeys,
  ] as const satisfies RequiredKeys<MailTemplateUpdateVOLike>[],
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

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
  };

  const res = await db
    .update(mailTemplateTable)
    .set(updateData)
    .where(eq(mailTemplateTable.id, id))
    .returning({ id: mailTemplateTable.id });
  const row = res[0];
  preventEmpty(row);
  return row.id;
}
const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新邮件模板",
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
    ...MailTemplateDeleteKeys,
  ] as const satisfies RequiredKeys<MailTemplateDeleteVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;
async function onDelete(
  obj: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const { id } = obj;
  const result = await db
    .delete(mailTemplateTable)
    .where(eq(mailTemplateTable.id, id))
    .returning({ id: mailTemplateTable.id });
  const row = result[0];
  preventEmpty(row);
  return row.id;
}
const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除邮件模板",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...MailTemplateGetKeys,
  ] as const satisfies RequiredKeys<MailTemplateGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MailTemplateVO,
  },
  required: [
    ...MailTemplateDetailKeys,
  ] as const satisfies RequiredKeys<MailTemplateVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const rows = await db
    .select()
    .from(mailTemplateTable)
    .where(eq(mailTemplateTable.id, id))
    .limit(1);
  const row = rows[0];
  preventEmpty(row);
  return row;
}
const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取邮件模板",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
