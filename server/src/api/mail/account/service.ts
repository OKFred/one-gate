import db from "@/db/index";
import {
  mailAccountTable,
  IndexVO,
  MailAccountVO,
  MailAccountListVO,
  MailAccountAddVO,
  MailAccountUpdateVO,
  MailAccountListKeys,
  MailAccountDetailKeys,
  MailAccountGetKeys,
  MailAccountDeleteKeys,
  MailAccountAddKeys,
  MailAccountUpdateKeys,
  MailAccountSortableKeys,
  type MailAccountPOLike,
  type MailAccountVOLike,
  type MailAccountAddVOLike,
  type MailAccountUpdateVOLike,
  type MailAccountDeleteVOLike,
  type MailAccountGetVOLike,
  MailAccountBaseVO,
  MailAccountUniqueKeys,
  MailAccountUniqueVO,
} from "./db.table";
import { asc, count, desc, eq, or, like, inArray, and } from "drizzle-orm";
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
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(mailAccountTable.mailAddress, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(mailAccountTable.isEnabled, isEnabled));
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
    isEnabled: MailAccountVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailAccountPOLike)[]>(
      MailAccountSortableKeys
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
      ...MailAccountBaseVO,
      ...MailAccountUniqueVO,
    },
    required: [...MailAccountGetKeys, ...MailAccountUniqueKeys],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;
async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = mailAccountTable[orderBy] || mailAccountTable.id;
  const maxLimit = 10000;
  const rows = await db
    .select({
      id: mailAccountTable.id,
      mailAddress: mailAccountTable.mailAddress,
      nickname: mailAccountTable.nickname,
      host: mailAccountTable.host,
      port: mailAccountTable.port,
      isEnabled: mailAccountTable.isEnabled,
    })
    .from(mailAccountTable)
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
    summary: "获取所有邮件账户（不分页）",
  } as const,
  adapter: bodyAdapter,
  service: onListAll,
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: MailAccountVO["isEnabled"],
    orderBy: orderByWrapper<(keyof MailAccountPOLike)[]>(
      MailAccountSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  ...listResponseWrapper<RequiredKeys<MailAccountPOLike>[]>(
    {
      ...MailAccountListVO,
    },
    [...MailAccountListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailAccountTable[orderBy] || mailAccountTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const countResult = await db
    .select({ total: count(mailAccountTable.id).as("total") })
    .from(mailAccountTable)
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
    .from(mailAccountTable)
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
    summary: "获取邮件账户列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...MailAccountAddVO,
  } satisfies Partial<Record<keyof MailAccountAddVOLike, JSONSchema>>,
  required: [
    ...MailAccountAddKeys,
  ] as const satisfies RequiredKeys<MailAccountAddVOLike>[],
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
  const { password: base64Password, ...rest } = obj;
  const plainPassword = Buffer.from(base64Password, "base64").toString("utf-8");
  const addData = {
    ...rest,
    password: plainPassword,
    creatorId,
  };
  const result = await db
    .insert(mailAccountTable)
    .values(addData)
    .returning({ id: mailAccountTable.id });

  return result[0]?.id;
}
const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加邮件账户",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...MailAccountUpdateVO,
  },
  required: [
    ...MailAccountUpdateKeys,
  ] as const satisfies RequiredKeys<MailAccountUpdateVOLike>[],
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
  const { id, isEnabled, password: base64Password, ...rest } = params;
  const plainPassword = base64Password
    ? Buffer.from(base64Password, "base64").toString("utf-8")
    : undefined;

  const updateData = {
    ...rest,
    password: plainPassword,
    updaterId,
    updateTimeUtc: getCurrentTimestampUtcSql(),
    isEnabled: isEnabled !== undefined ? isEnabled : undefined,
  };

  const res = await db
    .update(mailAccountTable)
    .set(updateData)
    .where(eq(mailAccountTable.id, id))
    .returning({ id: mailAccountTable.id });
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
    summary: "更新邮件账户",
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
    ...MailAccountDeleteKeys,
  ] as const satisfies RequiredKeys<MailAccountDeleteVOLike>[],
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
    .delete(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
    .returning({ id: mailAccountTable.id });
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
    summary: "删除邮件账户",
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
    ...MailAccountGetKeys,
  ] as const satisfies RequiredKeys<MailAccountGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...MailAccountVO,
  },
  required: [
    ...MailAccountDetailKeys,
  ] as const satisfies RequiredKeys<MailAccountVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
async function onGet(
  obj: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes> | null> {
  const { id } = obj;
  const rows = await db
    .select()
    .from(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
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
    summary: "获取邮件账户",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

const verifyReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: [
    ...MailAccountGetKeys,
  ] as const satisfies RequiredKeys<MailAccountGetVOLike>[],
  additionalProperties: false,
} as const satisfies JSONSchema;
const verifyRes = {
  type: "boolean",
  description: "验证结果，true 表示验证成功",
} as const satisfies JSONSchema;
async function onVerify(
  obj: FromSchema<typeof verifyReq>
): Promise<FromSchema<typeof verifyRes>> {
  const { id } = obj;
  const rows = await db
    .select()
    .from(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  const account = rows[0];
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: account.host,
    port: account.port,
    secure: account.port === 465, // true for 465, false for other ports
    auth: {
      user: account.mailAddress,
      pass: account.password,
    },
  });
  await transporter.verify();
  return true;
}
const verifyApi = {
  req: verifyReq,
  res: verifyRes,
  pathInfo: {
    path: "/verify",
    method: "post",
    summary: "验证邮件账户",
  } as const,
  adapter: bodyAdapter,
  service: onVerify,
} satisfies API;

async function getMailAccountsByIds(
  ids: number[]
): Promise<{ value: number; label: string }[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ value: mailAccountTable.id, label: mailAccountTable.mailAddress })
    .from(mailAccountTable)
    .where(inArray(mailAccountTable.id, ids));
  return rows;
}

async function verifyMailAccounts(mailAccountIdArr: number[]) {
  const rows = await getMailAccountsByIds(mailAccountIdArr);
  if (rows.length !== mailAccountIdArr.length) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  const returnedIds = rows.map((r) => r.value);
  const allExist = mailAccountIdArr.every((id) => returnedIds.includes(id));
  if (!allExist) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
}

export const utils = {
  getMailAccountsByIds,
  verifyMailAccounts,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  verify: verifyApi,
};
