import db from "@/db/index";
import { userAddLike, userTable } from "./db.table";
import { asc, count, desc, eq, or, like } from "drizzle-orm";
import bcrypt from "bcrypt";
import type { userAddReqLike, userAddResLike } from "./add/index";
import type { userDeleteReqLike, userDeleteResLike } from "./delete/index";
import type { userGetReqLike, userGetResLike } from "./get/index";
import type { userListReqLike, userListResLike } from "./list/index";
import type { userUpdateReqLike, userUpdateResLike } from "./update/index";

const SALT_ROUNDS = 12; // bcrypt盐轮数

const userService = {
    async add(obj: userAddReqLike) {
        const {
            username,
            password,
            department,
            role,
            isEnabled = true,
        } = obj;
        
        // 密码加盐处理
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const result = await db
            .insert(userTable)
            .values({
                username,
                password: hashedPassword,
                department,
                role,
                isEnabled,
            } satisfies userAddLike)
            .returning({ id: userTable.id });
        return result[0]?.id satisfies userAddResLike["data"];
    },
    
    async delete(uniqueKeyObj: userDeleteReqLike) {
        const { id, username } = uniqueKeyObj;
        if (id === undefined && username === undefined) return null;
        const result = await db
            .delete(userTable)
            .where(
                or(
                    id !== undefined ? eq(userTable.id, id) : undefined,
                    username !== undefined
                        ? eq(userTable.username, username)
                        : undefined,
                ),
            )
            .returning({
                id: userTable.id,
            });

        if (!result || result.length === 0) return null;
        return result[0].id satisfies userDeleteResLike["data"];
    },
    
    async list(listParamObj: userListReqLike) {
        const {
            orderBy = "id",
            descend = true,
            pageNo = 1,
            pageSize = 10,
            keyword = "",
        } = listParamObj;
        const offset = (pageNo - 1) * pageSize;
        const orderField = userTable[orderBy] || userTable.id;
        const maxPageSize = 1000;
        const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;
        
        const buildWhereCondition = () => {
            if (!keyword) return undefined;
            return or(
                like(userTable.username, `%${keyword}%`),
                like(userTable.department, `%${keyword}%`),
                like(userTable.role, `%${keyword}%`)
            );
        };
        
        const queryDB = (getAll?: boolean) =>
            db
                .select(
                    getAll
                        ? { total: count(userTable.id).as("total") }
                        : {
                            id: userTable.id,
                            username: userTable.username,
                            department: userTable.department,
                            role: userTable.role,
                            isEnabled: userTable.isEnabled,
                            createTimeUtc: userTable.createTimeUtc,
                            updateTimeUtc: userTable.updateTimeUtc,
                            // 注意：不返回密码字段
                        }
                )
                .from(userTable)
                .where(buildWhereCondition())
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
            } satisfies userListResLike["data"];
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
    
    async update(obj: userUpdateReqLike) {
        const { id, password, ...rest } = obj;
        const updateTimeUtc = new Date().valueOf();
        
        // 如果更新密码，需要重新加盐
        let updateData: any = {
            ...rest,
            updateTimeUtc,
        };
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            updateData.password = hashedPassword;
        }
        
        const res = await db
            .update(userTable)
            .set(updateData)
            .where(eq(userTable.id, id))
            .returning({ id: userTable.id });
        if (!res || res.length === 0) return null;
        return res[0].id satisfies userUpdateResLike["data"];
    },
    
    async get(uniqueKeyObj: userGetReqLike) {
        const { id, username } = uniqueKeyObj;
        const rows = await db
            .select({
                id: userTable.id,
                username: userTable.username,
                department: userTable.department,
                role: userTable.role,
                isEnabled: userTable.isEnabled,
                createTimeUtc: userTable.createTimeUtc,
                updateTimeUtc: userTable.updateTimeUtc,
                // 注意：不返回密码字段
            })
            .from(userTable)
            .where(
                or(
                    id !== undefined ? eq(userTable.id, id) : undefined,
                    username !== undefined
                        ? eq(userTable.username, username)
                        : undefined,
                ),
            )
            .limit(1);
        if (rows.length === 0) return null;
        return rows[0] satisfies userGetResLike["data"];
    },
    
    async verify(username: string, password: string) {
        const user = await db
            .select()
            .from(userTable)
            .where(eq(userTable.username, username))
            .limit(1);
            
        if (user.length === 0) return false;
        
        const userData = user[0];
        if (!userData.isEnabled) return false;
        
        const isValid = await bcrypt.compare(password, userData.password);
        return isValid;
    },
};

export default userService;
