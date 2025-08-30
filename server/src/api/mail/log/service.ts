import db from "@/db/index";
import { mailLogAddLike, mailLogTable } from "./db.table";
import { asc, count, desc, eq, or } from "drizzle-orm";
import type { mailLogAddReqLike, mailLogAddResLike } from "./add";
import type { mailLogDeleteReqLike, mailLogDeleteResLike } from "./delete";
import type { mailLogGetReqLike, mailLogGetResLike } from "./get";
import type { mailLogListReqLike, mailLogListResLike } from "./list";
import type { mailLogUpdateReqLike, mailLogUpdateResLike } from "./update";

const mailLogService = {
  async add(obj: mailLogAddReqLike) {
    const {
      mailTo,
      mailFrom,
      title,
      templateId,
      templateParams,
      sendStatus,
      exceptionCode,
      exceptionDetails,
    } = obj;
    const result = await db
      .insert(mailLogTable)
      .values({
        mailTo,
        mailFrom,
        title,
        templateId: templateId || null,
        templateParams: templateParams || null,
        sendStatus,
        exceptionCode: exceptionCode || null,
        exceptionDetails: exceptionDetails || null,
      } satisfies mailLogAddLike)
      .returning({ id: mailLogTable.id });
    return result[0]?.id satisfies mailLogAddResLike["data"];
  },
  async delete(uniqueKeyObj: mailLogDeleteReqLike) {
    const { id } = uniqueKeyObj;
    if (id === undefined) return null;
    const result = await db
      .delete(mailLogTable)
      .where(or(id !== undefined ? eq(mailLogTable.id, id) : undefined))
      .returning({
        id: mailLogTable.id,
      });

    if (!result || result.length === 0) return null;
    return result[0].id satisfies mailLogDeleteResLike["data"];
  },
  async list(listParamObj: mailLogListReqLike) {
    const {
      orderBy = "id",
      descend = true,
      pageNo = 1,
      pageSize = 10,
      keyword = "",
    } = listParamObj;
    const offset = (pageNo - 1) * pageSize;
    const orderField = mailLogTable[orderBy] || mailLogTable.id;
    const maxPageSize = 1000;
    const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;
    const queryDB = (getAll?: boolean) =>
      db
        .select(
          getAll ? { total: count(mailLogTable.id).as("total") } : undefined,
        )
        .from(mailLogTable)
        .where(keyword ? eq(mailLogTable.mailTo, keyword) : undefined)
        .orderBy(!descend ? asc(orderField) : desc(orderField))
        .limit(getAll ? maxPageSize : finalPageSize)
        .offset(getAll ? 0 : offset);
    const getAllResult = await queryDB(true);
    const total = getAllResult[0]?.total || 0;
    if (total === 0) {
      return {
        total,
        totalPage: 0,
        currentPage: pageNo,
        pageSize: finalPageSize,
        list: [] as any[],
      } satisfies mailLogListResLike["data"];
    }
    const rows = await queryDB(false);
    const totalPage = Math.ceil(total / finalPageSize);
    return {
      total,
      totalPage,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: rows,
    };
  },
  async update(obj: mailLogUpdateReqLike) {
    const { id, ...rest } = obj;
    const updateTimeUtc = new Date().valueOf();
    const res = await db
      .update(mailLogTable)
      .set({
        ...rest,
        updateTimeUtc,
      })
      .where(eq(mailLogTable.id, id))
      .returning({ id: mailLogTable.id });
    if (!res || res.length === 0) return null;
    return res[0].id satisfies mailLogUpdateResLike["data"];
  },
  async get(uniqueKeyObj: mailLogGetReqLike) {
    const { id } = uniqueKeyObj;
    const rows = await db
      .select()
      .from(mailLogTable)
      .where(or(id !== undefined ? eq(mailLogTable.id, id) : undefined))
      .limit(1);
    if (rows.length === 0) return null;
    return rows[0] satisfies mailLogGetResLike["data"];
  },
};

export default mailLogService;
