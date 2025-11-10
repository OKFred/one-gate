import db from "@/db/index";
import {
  mailAccountIndex,
  mailAccountUnique,
  mailAccountTimestamp,
  mailAccountTable,
  mailAccountData,
  type mailAccountAddLike,
  type mailAccountLike,
} from "./db.table";
import { asc, count, desc, eq } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { HTTPException } from "hono/http-exception";
import type { LanguageKey } from "@/types/locales";
import type { NodeHonoContext } from "@/types/app";
import * as commonSchema from "../common.schema";

const common = {
  onBeforeAddOrUpdate: (obj: Partial<mailAccountLike>): void => {
    const { sslEnable, starttlsEnable } = obj;
    if (sslEnable && starttlsEnable) {
      throw new HTTPException(400, {
        message: "i18n.api.mail.sslAndStarttlsConflict" satisfies LanguageKey,
      });
    }
    return;
  },
};

const addReq = {
  type: "object",
  properties: {
    ...mailAccountData,
  } satisfies Partial<Record<keyof mailAccountAddLike, JSONSchema>>,
  required: ["mailAddress", "nickname", "password"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const addRes = {
  ...mailAccountIndex["id"],
} as const satisfies JSONSchema;
async function onAdd(
  c: NodeHonoContext
): Promise<FromSchema<typeof addRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof addReq>;
  const {
    mailAddress,
    nickname,
    password,
    host = "",
    port = 465,
    sslEnable = true,
    starttlsEnable = false,
  } = obj;
  common.onBeforeAddOrUpdate(obj);
  const result = await db
    .insert(mailAccountTable)
    .values({
      mailAddress,
      nickname,
      password,
      host,
      port,
      sslEnable,
      starttlsEnable,
      creatorId: 1,
    } satisfies mailAccountAddLike)
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
  service: onAdd,
};

const deleteReq = {
  type: "object",
  properties: {
    ...mailAccountIndex,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const deleteRes = {
  ...mailAccountIndex["id"],
} as const satisfies JSONSchema;
async function onDelete(
  c: NodeHonoContext
): Promise<FromSchema<typeof deleteRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof deleteReq>;
  const { id } = uniqueKeyObj;
  if (id === undefined) return null;
  const result = await db
    .delete(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
    .returning({
      id: mailAccountTable.id,
    });
  if (!result || result.length === 0) return null;
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
  service: onDelete,
};

const listReq = {
  type: "object",
  properties: {
    orderBy: commonSchema.orderByWrapper([
      "id",
      "createTimeUtc",
    ] satisfies (keyof mailAccountLike)[]),
    ...commonSchema.listReqBase,
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
const listRes = {
  type: "object",
  properties: {
    ...commonSchema.listResBase,
    list: commonSchema.listWrapper({
      ...mailAccountIndex,
      ...mailAccountData,
      ...mailAccountTimestamp,
    } satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>),
  },
} as const satisfies JSONSchema;
async function onList(c: NodeHonoContext): Promise<FromSchema<typeof listRes>> {
  const listParamObj = c.get("bodyObj") as FromSchema<typeof listReq>;
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    keyword = "",
  } = listParamObj;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailAccountTable[orderBy] || mailAccountTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 函数重载：根据 getAll 参数提供不同的返回类型
  function queryDB(getAll: true): Promise<{ total: number }[]>;
  function queryDB(getAll: false): Promise<mailAccountLike[]>;
  function queryDB(
    getAll: boolean
  ): Promise<{ total: number }[] | mailAccountLike[]> {
    return db
      .select(
        getAll ? { total: count(mailAccountTable.id).as("total") } : undefined
      )
      .from(mailAccountTable)
      .where(keyword ? eq(mailAccountTable.mailAddress, keyword) : undefined)
      .orderBy(!descend ? asc(orderField) : desc(orderField))
      .limit(getAll ? maxPageSize : finalPageSize)
      .offset(getAll ? 0 : offset);
  }
  const getAllResult = await queryDB(true);
  const total = getAllResult[0]?.total || 0;
  const rows = await queryDB(false);
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
  service: onList,
};

const updateReq = {
  type: "object",
  properties: {
    ...mailAccountIndex,
    ...mailAccountData,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const updateRes = {
  ...mailAccountIndex["id"],
} as const satisfies JSONSchema;
async function onUpdate(
  c: NodeHonoContext
): Promise<FromSchema<typeof updateRes> | null> {
  const obj = c.get("bodyObj") as FromSchema<typeof updateReq>;
  const { id, ...rest } = obj;
  common.onBeforeAddOrUpdate(rest);
  const updateTimeUtc = new Date().valueOf();
  const res = await db
    .update(mailAccountTable)
    .set({
      ...rest,
      updateTimeUtc,
      updaterId: 1,
    })
    .where(eq(mailAccountTable.id, id))
    .returning({ id: mailAccountTable.id });
  if (!res || res.length === 0) return null;
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
  service: onUpdate,
};

const getReq = {
  type: "object",
  properties: {
    ...mailAccountIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const getRes = {
  type: "object",
  properties: {
    ...mailAccountIndex,
    ...mailAccountData,
    ...mailAccountTimestamp,
  } satisfies Partial<Record<keyof mailAccountLike, JSONSchema>>,
} as const satisfies JSONSchema;
async function onGet(
  c: NodeHonoContext
): Promise<FromSchema<typeof getRes> | null> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof getReq>;
  const { id } = uniqueKeyObj;
  const rows = await db
    .select()
    .from(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new HTTPException(404, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
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
  service: onGet,
};

const verifyReq = {
  type: "object",
  properties: {
    ...mailAccountIndex,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
const verifyRes = {
  type: "boolean",
  description: "验证结果，true 表示验证成功",
} as const satisfies JSONSchema;
async function onVerify(
  c: NodeHonoContext
): Promise<FromSchema<typeof verifyRes>> {
  const uniqueKeyObj = c.get("bodyObj") as FromSchema<typeof verifyReq>;
  const getContext = {
    ...c,
    req: {
      ...c.req,
      json: async () => uniqueKeyObj,
    },
  } as NodeHonoContext;
  const account = await onGet(getContext);
  if (!account?.id)
    throw new HTTPException(404, {
      message: "i18n.api.notExistOrDisabled" satisfies LanguageKey,
    });
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: account.host,
    port: account.port,
    secure: account.sslEnable,
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
  service: onVerify,
};

export default {
  add: addApi,
  delete: deleteApi,
  list: listApi,
  update: updateApi,
  get: getApi,
  verify: verifyApi,
};
