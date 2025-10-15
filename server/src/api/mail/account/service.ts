import db from "@/db/index";
import { mailAccountAddLike, mailAccountTable } from "./db.table";
import { asc, count, desc, eq, or } from "drizzle-orm";
import type { mailAccountAddReqLike, mailAccountAddResLike } from "./add";
import type {
    mailAccountDeleteReqLike,
    mailAccountDeleteResLike,
} from "./delete";
import type { mailAccountGetReqLike, mailAccountGetResLike } from "./get";
import type { mailAccountListReqLike, mailAccountListResLike } from "./list";
import type {
    mailAccountUpdateReqLike,
    mailAccountUpdateResLike,
} from "./update";

const mailAccountService = {
    async add(obj: any) {
        const {
            mailAddress,
            nickname,
            password,
            host = "",
            port = 465,
            sslEnable = true,
            starttlsEnable = false,
            accountOwner = "",
        } = obj;
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
                accountOwner,
            } satisfies mailAccountAddLike)
            .returning({ id: mailAccountTable.id });
        return result[0]?.id;
    },
    async delete(uniqueKeyObj: mailAccountDeleteReqLike) {
        const { id, mailAddress } = uniqueKeyObj;
        if (id === undefined && mailAddress === undefined) return null;
        const result = await db
            .delete(mailAccountTable)
            .where(
                or(
                    id !== undefined ? eq(mailAccountTable.id, id) : undefined,
                    mailAddress !== undefined
                        ? eq(mailAccountTable.mailAddress, mailAddress)
                        : undefined,
                ),
            )
            .returning({
                id: mailAccountTable.id,
            });

        if (!result || result.length === 0) return null;
        return result[0].id satisfies mailAccountDeleteResLike["data"];
    },
    async list(listParamObj: mailAccountListReqLike) {
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
        const queryDB = (getAll?: boolean) =>
            db
                .select(
                    getAll
                        ? { total: count(mailAccountTable.id).as("total") }
                        : undefined,
                )
                .from(mailAccountTable)
                .where(
                    keyword
                        ? eq(mailAccountTable.mailAddress, keyword)
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
            } satisfies mailAccountListResLike["data"];
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
    async update(obj: mailAccountUpdateReqLike) {
        const { id, ...rest } = obj;
        const updateTimeUtc = new Date().valueOf();
        const res = await db
            .update(mailAccountTable)
            .set({
                ...rest,
                updateTimeUtc,
            })
            .where(eq(mailAccountTable.id, id))
            .returning({ id: mailAccountTable.id });
        if (!res || res.length === 0) return null;
        return res[0].id satisfies mailAccountUpdateResLike["data"];
    },
    async get(uniqueKeyObj: mailAccountGetReqLike) {
        const { id, mailAddress } = uniqueKeyObj;
        const rows = await db
            .select()
            .from(mailAccountTable)
            .where(
                or(
                    id !== undefined ? eq(mailAccountTable.id, id) : undefined,
                    mailAddress !== undefined
                        ? eq(mailAccountTable.mailAddress, mailAddress)
                        : undefined,
                ),
            )
            .limit(1);
        if (rows.length === 0) return null;
        return rows[0] satisfies mailAccountGetResLike["data"];
    },
    async verify(uniqueKeyObj: mailAccountGetReqLike) {
        const account = await mailAccountService.get(uniqueKeyObj);
        if (!account?.id) throw new Error("未找到该 mailAccount");
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
    },
};

export default mailAccountService;
