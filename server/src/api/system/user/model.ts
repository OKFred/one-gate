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
    examples: ["QWRtaW5AM=="],
  },
} as const satisfies Partial<Record<keyof UserPOLike, JSONSchema>>;
export const UserBasePO = {
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
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
  regionId: {
    type: ["number", "null"],
    nullable: true,
    description: "国家地区ID",
    examples: [1],
    minimum: 1,
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
const UserRegionDTO = {
  regionObj: {
    type: ["object", "null"],
    nullable: true,
    description: "国家地区对象",
    properties: {
      value: {
        type: "number",
        description: "国家地区ID",
        examples: [1],
        minimum: 1,
      },
      label: {
        type: "string",
        description: "国家地区二位编码",
        examples: ["CN"],
        maxLength: 100,
      },
    },
    required: ["value", "label"],
    additionalProperties: false,
  },
} as const satisfies Partial<Record<string, JSONSchema>>;
const UserDepartmentDTO = {
  departmentObj: {
    type: ["object", "null"],
    nullable: true,
    description: "部门对象",
    properties: {
      value: {
        type: "number",
        description: "部门ID",
        examples: [1],
        minimum: 1,
      },
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
        value: {
          type: "number",
          description: "角色ID",
          examples: [1],
          minimum: 1,
        },
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
  regionObj: FromSchema<(typeof UserRegionDTO)["regionObj"]> | null;
  departmentObj: FromSchema<(typeof UserDepartmentDTO)["departmentObj"]> | null;
  roleArr: FromSchema<(typeof UserRoleDTO)["roleArr"]>;
};
type UserDTOMapKeyLike = "regionId" | "departmentId" | "roleIdArr";

//----------------- VO ----------------//
export { IndexVO }; // 删改查
export const UserUniqueVO = UserUniquePO;
export const UserBaseVO = {
  langCode: UserBasePO["langCode"],
  isEnabled: UserBasePO["isEnabled"],
  remark: UserBasePO["remark"],
  ...UserRegionDTO,
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
export const UserTokenVO = {
  token: {
    type: "string",
    description: "用户的token",
    examples: ["example-session-token"],
    maxLength: 500,
  },
} as const satisfies Partial<Record<"token", JSONSchema>>; // Token
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
  "remark",
  "regionObj",
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
  "regionId",
  "departmentId",
  "roleIdArr",
] as const satisfies RequiredKeys<Omit<UserPOLike, "password">>[];
export const UserDetailKeys = [
  ...UserBaseKeys,
  "regionObj",
  "departmentObj",
  "roleArr",
] as const satisfies RequiredKeys<UserVOLike>[];
export const UserUniqueKeys = ["username"] as const;
export const UserLoginResultKeys = [
  "token",
  "id",
  "username",
  "langCode",
] as const satisfies RequiredKeys<
  Pick<UserVOLike, "id" | "username" | "langCode"> & { token: string }
>[];
// 可排序字段（解耦供 service 使用）
export const UserSortableKeys = [
  "id",
  "username",
  "langCode",
  "regionId",
  "departmentId",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<UserPOLike>[];

//----------------- Table ----------------//
export const userTable = sqliteTable("system_user", {
  id: integer("id").primaryKey().notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  langCode: text("lang_code").notNull(),
  remark: text("remark"),
  regionId: integer("region_id"),
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

export default userTable;
