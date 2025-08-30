import db from "@/db/index";
import { mailTemplateAddLike, mailTemplateTable } from "./db.table";
import { asc, count, desc, eq, or } from "drizzle-orm";
import type { mailTemplateAddReqLike, mailTemplateAddResLike } from "./add";
import type {
    mailTemplateDeleteReqLike,
    mailTemplateDeleteResLike,
} from "./delete";
import type { mailTemplateGetReqLike, mailTemplateGetResLike } from "./get";
import type { mailTemplateListReqLike, mailTemplateListResLike } from "./list";
import type {
    mailTemplateUpdateReqLike,
    mailTemplateUpdateResLike,
} from "./update";

const mailTemplateService = {
    async add(obj: mailTemplateAddReqLike) {
        const { name, title, langCode, content, creatorName, category } = obj;
        const result = await db
            .insert(mailTemplateTable)
            .values({
                name,
                title,
                langCode,
                content,
                creatorName,
                category,
            } satisfies mailTemplateAddLike)
            .returning({ id: mailTemplateTable.id });
        return result[0]?.id satisfies mailTemplateAddResLike["data"];
    },
    async delete(uniqueKeyObj: mailTemplateDeleteReqLike) {
        const { id } = uniqueKeyObj;
        if (id === undefined) return null;
        const result = await db
            .delete(mailTemplateTable)
            .where(
                or(id !== undefined ? eq(mailTemplateTable.id, id) : undefined),
            )
            .returning({
                id: mailTemplateTable.id,
            });

        if (!result || result.length === 0) return null;
        return result[0].id satisfies mailTemplateDeleteResLike["data"];
    },
    async list(listParamObj: mailTemplateListReqLike) {
        const {
            orderBy = "id",
            descend = true,
            pageNo = 1,
            pageSize = 10,
            keyword = "",
        } = listParamObj;
        const offset = (pageNo - 1) * pageSize;
        const orderField = mailTemplateTable[orderBy] || mailTemplateTable.id;
        const maxPageSize = 1000;
        const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;
        const queryDB = (getAll?: boolean) =>
            db
                .select(
                    getAll
                        ? { total: count(mailTemplateTable.id).as("total") }
                        : undefined,
                )
                .from(mailTemplateTable)
                .where(
                    keyword
                        ? or(
                              eq(mailTemplateTable.name, keyword),
                              eq(mailTemplateTable.title, keyword),
                              eq(mailTemplateTable.langCode, keyword),
                              eq(mailTemplateTable.creatorName, keyword),
                              eq(mailTemplateTable.category, keyword),
                          )
                        : undefined,
                )
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
            } satisfies mailTemplateListResLike["data"];
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
    async update(obj: mailTemplateUpdateReqLike) {
        const { id, ...rest } = obj;
        const updateTimeUtc = new Date().valueOf();
        const res = await db
            .update(mailTemplateTable)
            .set({
                ...rest,
                updateTimeUtc,
            })
            .where(eq(mailTemplateTable.id, id))
            .returning({ id: mailTemplateTable.id });
        if (!res || res.length === 0) return null;
        return res[0].id satisfies mailTemplateUpdateResLike["data"];
    },
    async get(uniqueKeyObj: mailTemplateGetReqLike) {
        const { id } = uniqueKeyObj;
        const rows = await db
            .select()
            .from(mailTemplateTable)
            .where(
                or(id !== undefined ? eq(mailTemplateTable.id, id) : undefined),
            )
            .limit(1);
        if (rows.length === 0) return null;
        return rows[0] satisfies mailTemplateGetResLike["data"];
    },
};

export default mailTemplateService;
