import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
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
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- PO ----------------//
export const ProfileBasePO = {
  userId: {
    type: "number",
    description: "关联用户ID",
    examples: [1],
    minimum: 1,
  },
  realName: {
    type: "string",
    description: "姓名",
    examples: ["张三"],
    maxLength: 100,
  },
  gender: {
    type: ["string", "null"],
    nullable: true,
    description: "性别 (male/female/other)",
    examples: ["male"],
    maxLength: 20,
  },
  email: {
    type: ["string", "null"],
    nullable: true,
    description: "电子邮箱",
    examples: ["zhangsan@example.com"],
    maxLength: 100,
  },
  phone: {
    type: ["string", "null"],
    nullable: true,
    description: "手机号码",
    examples: ["13800138000"],
    maxLength: 50,
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注信息",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof ProfilePOLike, JSONSchema>>;

const ProfilePO = {
  ...IndexPO,
  ...ProfileBasePO,
  ...AuditPO,
} as const satisfies Record<keyof ProfilePOLike, JSONSchema>;

export type ProfilePOLike = InferSelectModel<typeof profileTable>;
type ProfileSelectPOLike = InferInsertModel<typeof profileTable>;
type ProfileAddPOLike = Omit<ProfilePOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type ProfileUpdatePOLike = Partial<
  Omit<ProfileSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<ProfilePOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const ProfileBaseVO = ProfileBasePO;
export const ProfileVO = {
  ...IndexVO,
  ...ProfileBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof ProfileVOLike, JSONSchema>>;
export const ProfileListVO = ProfileVO;
export const ProfileAddVO = {
  ...ProfileBaseVO,
} as const satisfies Partial<Record<keyof ProfileVOLike, JSONSchema>>;
export const ProfileUpdateVO = {
  ...IndexVO,
  ...ProfileBaseVO,
} as const satisfies Partial<Record<keyof ProfileVOLike, JSONSchema>>;

export type ProfileVOLike = ProfilePOLike;
export type ProfileAddVOLike = Omit<ProfileAddPOLike, "creatorId">;
export type ProfileUpdateVOLike = ProfileUpdatePOLike;
export type ProfileDeleteVOLike = Pick<ProfileVOLike, IndexKeyLike>;
export type ProfileGetVOLike = Pick<ProfileVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const ProfileAddKeys = [
  "userId",
  "realName",
] as const satisfies RequiredKeys<ProfileAddVOLike>[];

export const ProfileUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ProfileUpdateVOLike>[];

export const ProfileDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ProfileDeleteVOLike>[];

export const ProfileGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ProfileGetVOLike>[];

const ProfileBaseKeys = [
  ...IndexKey,
  ...ProfileAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<ProfilePOLike>[];

export const ProfileListKeys = ProfileBaseKeys;
export const ProfileDetailKeys = ProfileBaseKeys;

export const ProfileSortableKeys = [
  "id",
  "userId",
  "realName",
  "createTimeUtc",
] as const satisfies RequiredKeys<ProfilePOLike>[];

//----------------- Table ----------------//
export const profileTable = sqliteTable("personal_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  realName: text("real_name").notNull(),
  gender: text("gender"),
  email: text("email"),
  phone: text("phone"),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default profileTable;
