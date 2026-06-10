import db from "@/db/index";
import { hashPassword } from "@/utils/crypto";
import { sql, eq } from "drizzle-orm";
import { userTable } from "@/api/system/user/model";
import { roleTable } from "@/api/system/role/model";
import {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN,
  SUPER_ADMIN_ID,
  SUPER_ADMIN_ROLE,
} from "./init";

/**
 * 准备超级管理员角色同步语句
 */
export async function prepareSuperAdminRole(options?: { reset?: boolean }) {
  const stats = { total: 1, created: 0, updated: 0, skipped: 0 };
  const queries: any[] = [];

  if (options?.reset) {
    queries.push(
      db.delete(roleTable).where(eq(roleTable.id, SUPER_ADMIN_ROLE_ID))
    );
  }

  queries.push(
    db
      .insert(roleTable)
      .values({ ...SUPER_ADMIN_ROLE, id: SUPER_ADMIN_ROLE_ID })
      .onConflictDoUpdate({
        target: roleTable.id,
        set: {
          name: SUPER_ADMIN_ROLE.name,
          isEnabled: SUPER_ADMIN_ROLE.isEnabled,
          dataScope: SUPER_ADMIN_ROLE.dataScope,
        },
      })
  );

  stats.created = 1;
  return { queries, stats };
}

/**
 * 准备超级管理员账号同步语句
 */
export async function prepareSuperAdminUser(
  roleId: number,
  options?: { reset?: boolean }
) {
  const stats = { total: 1, created: 0, updated: 0, skipped: 0 };
  const queries: any[] = [];

  if (options?.reset) {
    queries.push(
      db.delete(userTable).where(eq(userTable.username, SUPER_ADMIN.username))
    );
  }

  // 加密密码 (异步准备工作)
  const hashedPassword = await hashPassword(SUPER_ADMIN.password);

  queries.push(
    db
      .insert(userTable)
      .values({
        id: SUPER_ADMIN_ID,
        username: SUPER_ADMIN.username,
        password: hashedPassword,
        langCode: SUPER_ADMIN.langCode,
        roleIdArr: [roleId],
        isEnabled: true,
        creatorId: SUPER_ADMIN_ID,
        remark: "系统初始化创建的超级管理员账号",
      })
      .onConflictDoUpdate({
        target: userTable.username,
        set: {
          langCode: SUPER_ADMIN.langCode,
          roleIdArr: sql`excluded.role_id_arr`,
          isEnabled: true,
        },
      })
  );

  stats.created = 1;
  return { queries, stats };
}
