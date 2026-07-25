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

// 联系人表
export const socialContactsTable = sqliteTable("personal_social_contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  realName: text("real_name").notNull(),
  relationCircle: text("relation_circle").notNull(), // close_friend | colleague | classmate | business | other
  company: text("company"),
  position: text("position"),
  phone: text("phone"),
  email: text("email"),
  avatar: text("avatar"),
  intimacyLevel: integer("intimacy_level").default(3), // 1 ~ 5
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

// 关系拓扑边表
export const socialRelationsTable = sqliteTable("personal_social_relations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceContactId: integer("source_contact_id").notNull(),
  targetContactId: integer("target_contact_id").notNull(),
  relationType: text("relation_type").notNull(),
  relationLabel: text("relation_label").notNull(), // e.g. "挚友", "同事", "项目合作"
  intimacyScore: integer("intimacy_score").default(80),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"),
  updaterId: integer("updater_id"),
  updaterName: text("updater_name"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export type SocialContactPOLike = InferSelectModel<typeof socialContactsTable>;
export type SocialRelationPOLike = InferSelectModel<
  typeof socialRelationsTable
>;

export { IndexVO };

export const SocialContactPO = {
  ...IndexPO,
  realName: { type: "string" },
  relationCircle: {
    type: "string",
    enum: ["close_friend", "colleague", "classmate", "business", "other"],
  },
  company: { type: ["string", "null"], nullable: true },
  position: { type: ["string", "null"], nullable: true },
  phone: { type: ["string", "null"], nullable: true },
  email: { type: ["string", "null"], nullable: true },
  avatar: { type: ["string", "null"], nullable: true },
  intimacyLevel: { type: "number" },
  remark: { type: ["string", "null"], nullable: true },
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof SocialContactPOLike, JSONSchema>;

export const SocialContactAddVO = {
  realName: SocialContactPO.realName,
  relationCircle: SocialContactPO.relationCircle,
  company: SocialContactPO.company,
  position: SocialContactPO.position,
  phone: SocialContactPO.phone,
  email: SocialContactPO.email,
  avatar: SocialContactPO.avatar,
  intimacyLevel: SocialContactPO.intimacyLevel,
  remark: SocialContactPO.remark,
} as const satisfies Partial<Record<keyof SocialContactPOLike, JSONSchema>>;

export const SocialContactUpdateVO = {
  id: IndexVO.id,
  ...SocialContactAddVO,
} as const satisfies Partial<Record<keyof SocialContactPOLike, JSONSchema>>;

export const SocialRelationPO = {
  ...IndexPO,
  sourceContactId: { type: "number" },
  targetContactId: { type: "number" },
  relationType: { type: "string" },
  relationLabel: { type: "string" },
  intimacyScore: { type: "number" },
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof SocialRelationPOLike, JSONSchema>;

export const SocialContactListKeys = [
  ...IndexKey,
  "realName",
  "relationCircle",
  "intimacyLevel",
  ...AuditKeys,
] as const satisfies RequiredKeys<SocialContactPOLike>[];
