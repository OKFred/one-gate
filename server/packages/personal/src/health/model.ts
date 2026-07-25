import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
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

// Medical Records Table
export const medicalRecordsTable = sqliteTable("personal_medical_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), // outpatient | hospitalization | exam | prescription | vaccination
  title: text("title").notNull(),
  hospitalName: text("hospital_name"),
  doctorName: text("doctor_name"),
  visitDateUtc: integer("visit_date_utc").notNull(),
  diagnosis: text("diagnosis"),
  prescription: text("prescription"),
  reportUrl: text("report_url"),
  cost: real("cost").default(0),
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

export type MedicalRecordPOLike = InferSelectModel<typeof medicalRecordsTable>;
type MedicalRecordSelectPOLike = InferInsertModel<typeof medicalRecordsTable>;

const MedicalRecordBasePO = {
  category: {
    type: "string",
    description: "记录分类",
    enum: [
      "outpatient",
      "hospitalization",
      "exam",
      "prescription",
      "vaccination",
    ],
  },
  title: { type: "string", description: "记录标题/诊断名称" },
  hospitalName: {
    type: ["string", "null"],
    nullable: true,
    description: "医院名称",
  },
  doctorName: {
    type: ["string", "null"],
    nullable: true,
    description: "医生姓名",
  },
  visitDateUtc: { type: "number", description: "就诊/检查时间(毫秒时间戳)" },
  diagnosis: {
    type: ["string", "null"],
    nullable: true,
    description: "诊断结论",
  },
  prescription: {
    type: ["string", "null"],
    nullable: true,
    description: "处方/用药医嘱",
  },
  reportUrl: {
    type: ["string", "null"],
    nullable: true,
    description: "报告或附件链接",
  },
  cost: { type: "number", description: "费用(元)" },
  remark: { type: ["string", "null"], nullable: true, description: "备注" },
} as const satisfies Partial<Record<keyof MedicalRecordPOLike, JSONSchema>>;

export const MedicalRecordPO = {
  ...IndexPO,
  ...MedicalRecordBasePO,
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof MedicalRecordPOLike, JSONSchema>;

export { IndexVO };
export const MedicalRecordBaseVO = MedicalRecordBasePO;
export const MedicalRecordVO = MedicalRecordPO;
export const MedicalRecordListVO = MedicalRecordVO;

export type MedicalRecordVOLike = MedicalRecordPOLike;
export type MedicalRecordAddVOLike = Omit<
  MedicalRecordPOLike,
  IndexKeyLike | AuditAddOmitKeyLike | "creatorName" | "updaterName"
>;
export type MedicalRecordUpdateVOLike = Partial<
  Omit<
    MedicalRecordSelectPOLike,
    IndexKeyLike | AuditUpdateOmitKeyLike | "creatorName" | "updaterName"
  >
> &
  Pick<MedicalRecordPOLike, IndexKeyLike>;

export type MedicalRecordDeleteVOLike = Pick<MedicalRecordVOLike, IndexKeyLike>;

export const MedicalRecordAddVO = {
  ...MedicalRecordBaseVO,
} as const satisfies Partial<Record<keyof MedicalRecordAddVOLike, JSONSchema>>;

export const MedicalRecordUpdateVO = {
  ...IndexVO,
  ...MedicalRecordBaseVO,
} as const satisfies Partial<
  Record<keyof MedicalRecordUpdateVOLike, JSONSchema>
>;

export const MedicalRecordAddKeys = [
  "category",
  "title",
  "visitDateUtc",
] as const satisfies RequiredKeys<MedicalRecordAddVOLike>[];
export const MedicalRecordUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MedicalRecordUpdateVOLike>[];
export const MedicalRecordDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MedicalRecordDeleteVOLike>[];

const MedicalRecordBaseKeys = [
  ...IndexKey,
  ...MedicalRecordAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<MedicalRecordPOLike>[];

export const MedicalRecordListKeys = MedicalRecordBaseKeys;
export const MedicalRecordDetailKeys = MedicalRecordBaseKeys;

export const MedicalRecordSortableKeys = [
  "id",
  "visitDateUtc",
  "category",
  "cost",
  "createTimeUtc",
] as const satisfies RequiredKeys<MedicalRecordPOLike>[];
