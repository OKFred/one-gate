import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import {
  IndexPO,
  IndexVO,
  AuditPO,
  AuditVO,
  IndexKey,
  AuditKeys,
  type IndexKeyLike,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
} from "@/db/common/schema";
import { type RequiredKeys } from "@/types/app";

//----------------- PO ----------------//
const UserUniquePO = {
  username: {
    type: "string",
    description: "用户名",
    examples: ["user"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof UserPOLike, JSONSchema>>;
const UserPasswordPO = {
  password: {
    type: "string",
    description: "密码",
    examples: ["pass"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof UserPOLike, JSONSchema>>;
const UserBasePO = {
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US", "zh-CN"],
    maxLength: 10,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  departmentId: {
    type: ["number", "null"],
    nullable: true,
    description: "部门ID",
    examples: [1],
    minimum: 1,
  },
  roleIdArr: {
    type: "array",
    description: "角色ID数组",
    items: {
      type: "number",
      examples: [1],
      minimum: 1,
    },
  },
} as const satisfies Partial<Record<keyof UserPOLike, JSONSchema>>;
const UserPO = {
  ...IndexPO,
  ...UserUniquePO,
  ...UserPasswordPO,
  ...UserBasePO,
  ...AuditPO,
} as const satisfies Record<keyof UserPOLike, JSONSchema>;
export type UserPOLike = InferSelectModel<typeof userTable>; // 列表
type UserSelectPOLike = InferInsertModel<typeof userTable>;
type UserAddPOLike = Omit<UserPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type UserUpdatePOLike = Partial<
  Omit<UserSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<UserPOLike, IndexKeyLike>;
// type UserDeletePOLike = Pick<UserPOLike, IndexKeyLike>;

//----------------- DTO ----------------//
const UserDepartmentDTO = {
  departmentObj: {
    type: ["object", "null"],
    nullable: true,
    description: "部门对象",
    properties: {
      value: { type: "number", description: "部门ID", examples: [1], minimum: 1 },
      label: {
        type: "string",
        description: "部门名称",
        examples: ["研发部"],
        maxLength: 100,
      },
    },
    required: ["value", "label"],
    additionalProperties: false,
  },
} as const satisfies Partial<Record<string, JSONSchema>>;
const UserRoleDTO = {
  roleArr: {
    type: "array",
    description: "角色数组",
    items: {
      type: "object",
      properties: {
        value: { type: "number", description: "角色ID", examples: [1], minimum: 1 },
        label: {
          type: "string",
          description: "角色名称",
          examples: ["管理员"],
          maxLength: 100,
        },
      },
      required: ["value", "label"],
      additionalProperties: false,
    },
  },
} as const satisfies Partial<Record<string, JSONSchema>>;
type UserDTOLike = {
  departmentObj: FromSchema<(typeof UserDepartmentDTO)["departmentObj"]> | null;
  roleArr: FromSchema<(typeof UserRoleDTO)["roleArr"]>;
};
type UserDTOMapKeyLike = "departmentId" | "roleIdArr";

//----------------- VO ----------------//
export { IndexVO }; // 删改查
const UserUniqueVO = UserUniquePO;
const UserBaseVO = {
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US", "zh-CN"],
    maxLength: 10,
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  ...UserDepartmentDTO,
  ...UserRoleDTO,
} as const satisfies Partial<Record<keyof UserVOLike, JSONSchema>>;
export const UserVO = {
  ...IndexVO,
  ...UserUniqueVO,
  ...UserBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof UserVOLike, JSONSchema>>; // 详情
export const UserListVO = {
  ...IndexVO,
  ...UserUniqueVO,
  ...UserBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof UserVOLike, JSONSchema>>; // 列表
export const UserAddVO = {
  ...UserUniqueVO,
  ...UserPasswordPO,
  ...UserBaseVO,
} as const satisfies Partial<Record<keyof UserVOLike, JSONSchema>>; // 新增
export const UserUpdateVO = {
  ...IndexVO,
  ...UserUniqueVO,
  ...UserBaseVO,
} as const satisfies Partial<Record<keyof UserVOLike, JSONSchema>>; // 更新
export type UserVOLike = Omit<UserPOLike, UserDTOMapKeyLike> & UserDTOLike;
export type UserAddVOLike = Omit<
  UserAddPOLike,
  "creatorId" | UserDTOMapKeyLike
> &
  UserDTOLike;
export type UserUpdateVOLike = Omit<UserUpdatePOLike, UserDTOMapKeyLike> &
  Partial<UserDTOLike>;
export type UserDeleteVOLike = Pick<UserVOLike, IndexKeyLike>;
export type UserGetVOLike = Pick<UserVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const UserAddKeys = [
  "username",
  "password",
  "langCode",
  "isEnabled",
  "departmentObj",
  "roleArr",
] as const satisfies RequiredKeys<UserAddVOLike>[];
export const UserUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<UserUpdateVOLike>[];
export const UserDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<UserDeleteVOLike>[];
export const UserGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<UserGetVOLike>[];
const UserBaseKeys = [
  ...IndexKey,
  "username",
  "langCode",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<Omit<UserPOLike, "password">>[];
export const UserListKeys = [
  ...UserBaseKeys,
  "departmentId",
  "roleIdArr",
] as const satisfies RequiredKeys<Omit<UserPOLike, "password">>[];
export const UserDetailKeys = [
  ...UserBaseKeys,
  "departmentObj",
  "roleArr",
] as const satisfies RequiredKeys<UserVOLike>[];

//----------------- Table ----------------//
export const userTable = sqliteTable("system_user", {
  id: integer("id").primaryKey().notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  langCode: text("lang_code").notNull(),
  departmentId: integer("department_id"),
  roleIdArr: text("role_id_arr", { mode: "json" }).$type<number[]>().notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(`
        CREATE TABLE IF NOT EXISTS system_user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            lang_code TEXT NOT NULL,
            department_id INTEGER,
            role_id_arr TEXT NOT NULL,
            is_enabled INTEGER NOT NULL,
            creator_id INTEGER NOT NULL,
            updater_id INTEGER,
            create_time_utc INTEGER DEFAULT (
              CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
              CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
            ),
            update_time_utc INTEGER
        )
    `);
  console.log("💾 表 system_user 已初始化");
}

export default userTable;
