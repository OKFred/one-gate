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

export const familyMembersTable = sqliteTable("personal_family_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isSelf: integer("is_self", { mode: "boolean" }).notNull(),
  relationType: text("relation_type").notNull(), // self | spouse | parent | child | sibling | grandparent | other
  realName: text("real_name").notNull(),
  gender: text("gender"), // male | female | other
  avatar: text("avatar"),
  birthDateUtc: integer("birth_date_utc"),
  phone: text("phone"),
  isEmergencyContact: integer("is_emergency_contact", {
    mode: "boolean",
  }).notNull(),
  healthNote: text("health_note"),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"),
  updaterId: integer("updater_id"),
  updaterName: text("updater_name"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export type FamilyMemberPOLike = InferSelectModel<typeof familyMembersTable>;
type FamilyMemberSelectPOLike = InferInsertModel<typeof familyMembersTable>;

const FamilyMemberBasePO = {
  isSelf: { type: "boolean", description: "是否本人节点" },
  relationType: {
    type: "string",
    description: "关系类型",
    enum: [
      "self",
      "spouse",
      "parent",
      "child",
      "sibling",
      "grandparent",
      "other",
    ],
  },
  realName: { type: "string", description: "姓名" },
  gender: { type: ["string", "null"], nullable: true, description: "性别" },
  avatar: { type: ["string", "null"], nullable: true, description: "头像URL" },
  birthDateUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "出生日期毫秒",
  },
  phone: { type: ["string", "null"], nullable: true, description: "联系电话" },
  isEmergencyContact: { type: "boolean", description: "是否紧急联系人" },
  healthNote: {
    type: ["string", "null"],
    nullable: true,
    description: "健康状况备注",
  },
  remark: { type: ["string", "null"], nullable: true, description: "其他备注" },
} as const satisfies Partial<Record<keyof FamilyMemberPOLike, JSONSchema>>;

export const FamilyMemberPO = {
  ...IndexPO,
  ...FamilyMemberBasePO,
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof FamilyMemberPOLike, JSONSchema>;

export { IndexVO };
export const FamilyMemberBaseVO = FamilyMemberBasePO;
export const FamilyMemberVO = FamilyMemberPO;
export const FamilyMemberListVO = FamilyMemberVO;

export type FamilyMemberVOLike = FamilyMemberPOLike;
export type FamilyMemberAddVOLike = Omit<
  FamilyMemberPOLike,
  IndexKeyLike | AuditAddOmitKeyLike | "creatorName" | "updaterName"
>;
export type FamilyMemberUpdateVOLike = Partial<
  Omit<
    FamilyMemberSelectPOLike,
    IndexKeyLike | AuditUpdateOmitKeyLike | "creatorName" | "updaterName"
  >
> &
  Pick<FamilyMemberPOLike, IndexKeyLike>;

export const FamilyMemberAddVO = {
  ...FamilyMemberBaseVO,
} as const satisfies Partial<Record<keyof FamilyMemberAddVOLike, JSONSchema>>;

export const FamilyMemberUpdateVO = {
  ...IndexVO,
  ...FamilyMemberBaseVO,
} as const satisfies Partial<
  Record<keyof FamilyMemberUpdateVOLike, JSONSchema>
>;

export const FamilyMemberAddKeys = [
  "relationType",
  "realName",
] as const satisfies RequiredKeys<FamilyMemberAddVOLike>[];

export const FamilyMemberUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<FamilyMemberUpdateVOLike>[];

const FamilyMemberBaseKeys = [
  ...IndexKey,
  ...FamilyMemberAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<FamilyMemberPOLike>[];

export const FamilyMemberListKeys = FamilyMemberBaseKeys;
