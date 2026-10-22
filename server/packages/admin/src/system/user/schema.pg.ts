import { pgTable, text, boolean, jsonb } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const userTable = pgTable(
  "system_user",
  {
    id: pgIdentity(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    langCode: text("lang_code").notNull(),
    remark: text("remark"),
    regionId: pgInteger("region_id"),
    departmentId: pgInteger("department_id"),
    roleIdArr: jsonb("role_id_arr").$type<number[]>().notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    ...pgAuditColumns(),
  },
  (table) => pgIntegerBounds("system_user", table)
);

export default userTable;
