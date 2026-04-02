import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
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
const MailLogUniquePO = {} as const satisfies Partial<
  Record<keyof MailLogPOLike, JSONSchema>
>;

const MailLogBasePO = {
  mailTo: {
    type: "string",
    format: "email",
    description: "收件人邮箱地址",
    examples: ["receiver@example.com"],
  },
  mailFrom: {
    type: "string",
    format: "email",
    description: "发件人邮箱地址",
    examples: ["sender@example.com"],
  },
  title: {
    type: "string",
    description: "邮件标题",
    examples: ["Welcome to register on our platform!"],
  },
  templateId: {
    type: ["string", "null"],
    nullable: true,
    description: "邮件模板ID",
  },
  templateParams: {
    type: ["string", "null"],
    nullable: true,
    description: "邮件模板参数",
  },
  sendStatus: {
    type: "boolean",
    description: "发送状态",
  },
  exceptionCode: {
    type: ["string", "null"],
    nullable: true,
    description: "异常代码",
  },
  exceptionDetails: {
    type: ["string", "null"],
    nullable: true,
    description: "异常详情",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MailLogPOLike, JSONSchema>>;

const MailLogPO = {
  ...IndexPO,
  ...MailLogUniquePO,
  ...MailLogBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MailLogPOLike, JSONSchema>;

export type MailLogPOLike = InferSelectModel<typeof mailLogTable>;
type MailLogSelectPOLike = InferInsertModel<typeof mailLogTable>;
type MailLogAddPOLike = Omit<MailLogPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type MailLogUpdatePOLike = Partial<
  Omit<MailLogSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MailLogPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MailLogUniqueVO = MailLogUniquePO;
export const MailLogBaseVO = MailLogBasePO;
export const MailLogVO = {
  ...IndexVO,
  ...MailLogUniqueVO,
  ...MailLogBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MailLogVOLike, JSONSchema>>;
export const MailLogListVO = MailLogVO;
export const MailLogAddVO = {
  ...MailLogUniqueVO,
  ...MailLogBaseVO,
} as const satisfies Partial<Record<keyof MailLogVOLike, JSONSchema>>;
export const MailLogUpdateVO = {
  ...IndexVO,
  ...MailLogUniqueVO,
  ...MailLogBaseVO,
} as const satisfies Partial<Record<keyof MailLogVOLike, JSONSchema>>;

export type MailLogVOLike = MailLogPOLike;
export type MailLogAddVOLike = Omit<MailLogAddPOLike, "creatorId">;
export type MailLogUpdateVOLike = MailLogUpdatePOLike;
export type MailLogDeleteVOLike = Pick<MailLogVOLike, IndexKeyLike>;
export type MailLogGetVOLike = Pick<MailLogVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const MailLogAddKeys = [
  "mailTo",
  "mailFrom",
  "title",
  "sendStatus",
] as const satisfies RequiredKeys<MailLogAddVOLike>[];

export const MailLogUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailLogUpdateVOLike>[];

export const MailLogDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailLogDeleteVOLike>[];

export const MailLogGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailLogGetVOLike>[];

const MailLogBaseKeys = [
  ...IndexKey,
  ...MailLogAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<MailLogPOLike>[];

export const MailLogListKeys = MailLogBaseKeys;
export const MailLogDetailKeys = MailLogBaseKeys;
export const MailLogUniqueKeys = [] as const;

// 可排序字段
export const MailLogSortableKeys = [
  "id",
  "mailTo",
  "mailFrom",
  "sendStatus",
  "createTimeUtc",
] as const satisfies RequiredKeys<MailLogPOLike>[];

export const mailLogTable = sqliteTable(
  "mail_log",
  {
    id: integer("id").primaryKey().notNull(),
    mailTo: text("mail_to").notNull(),
    mailFrom: text("mail_from").notNull(),
    title: text("title").notNull(),
    templateId: text("template_id"),
    templateParams: text("template_params"),
    sendStatus: integer("send_status", { mode: "boolean" }).notNull(),
    exceptionCode: text("exception_code"),
    exceptionDetails: text("exception_details"),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    index("idx_mail_to_time").on(table.mailTo, table.createTimeUtc),
    index("idx_send_status").on(table.sendStatus),
    index("idx_template_id").on(table.templateId),
    index("idx_create_time").on(table.createTimeUtc),
  ]
);

export default mailLogTable;
