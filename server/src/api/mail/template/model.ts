import db from "@/db/index";
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
const MailTemplateUniquePO = {
  name: {
    type: "string",
    description: "邮件模板名称",
    examples: ["welcome_email"],
  },
} as const satisfies Partial<Record<keyof MailTemplatePOLike, JSONSchema>>;

const MailTemplateBasePO = {
  title: {
    type: "string",
    description: "邮件标题",
    examples: ["Welcome to our service!"],
  },
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US"],
  },
  content: {
    type: "string",
    description: "邮件内容",
  },
  category: {
    type: "string",
    description: "邮件分类",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    examples: ["这是一个测试邮箱模板"],
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MailTemplatePOLike, JSONSchema>>;

const MailTemplatePO = {
  ...IndexPO,
  ...MailTemplateUniquePO,
  ...MailTemplateBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MailTemplatePOLike, JSONSchema>;

export type MailTemplatePOLike = InferSelectModel<typeof mailTemplateTable>;
type MailTemplateSelectPOLike = InferInsertModel<typeof mailTemplateTable>;
type MailTemplateAddPOLike = Omit<
  MailTemplatePOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MailTemplateUpdatePOLike = Partial<
  Omit<MailTemplateSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MailTemplatePOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MailTemplateUniqueVO = MailTemplateUniquePO;
export const MailTemplateBaseVO = MailTemplateBasePO;
export const MailTemplateVO = {
  ...IndexVO,
  ...MailTemplateUniqueVO,
  ...MailTemplateBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MailTemplateVOLike, JSONSchema>>;
export const MailTemplateListVO = MailTemplateVO;
export const MailTemplateAddVO = {
  ...MailTemplateUniqueVO,
  ...MailTemplateBaseVO,
} as const satisfies Partial<Record<keyof MailTemplateVOLike, JSONSchema>>;
export const MailTemplateUpdateVO = {
  ...IndexVO,
  ...MailTemplateUniqueVO,
  ...MailTemplateBaseVO,
} as const satisfies Partial<Record<keyof MailTemplateVOLike, JSONSchema>>;

export type MailTemplateVOLike = MailTemplatePOLike;
export type MailTemplateAddVOLike = Omit<MailTemplateAddPOLike, "creatorId">;
export type MailTemplateUpdateVOLike = MailTemplateUpdatePOLike;
export type MailTemplateDeleteVOLike = Pick<MailTemplateVOLike, IndexKeyLike>;
export type MailTemplateGetVOLike = Pick<MailTemplateVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const MailTemplateAddKeys = [
  "name",
  "title",
  "langCode",
  "content",
  "isEnabled",
] as const satisfies RequiredKeys<MailTemplateAddVOLike>[];

export const MailTemplateUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailTemplateUpdateVOLike>[];

export const MailTemplateDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailTemplateDeleteVOLike>[];

export const MailTemplateGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MailTemplateGetVOLike>[];

const MailTemplateBaseKeys = [
  ...IndexKey,
  ...MailTemplateAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<MailTemplatePOLike>[];

export const MailTemplateListKeys = MailTemplateBaseKeys;
export const MailTemplateDetailKeys = MailTemplateBaseKeys;
export const MailTemplateUniqueKeys = ["name"] as const;

// 可排序字段
export const MailTemplateSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<MailTemplatePOLike>[];

export const mailTemplateTable = sqliteTable(
  "mail_template",
  {
    id: integer("id").primaryKey().notNull(),
    name: text("name").notNull().unique(),
    title: text("title").notNull(),
    langCode: text("lang_code").notNull(),
    content: text("content").notNull(),
    category: text("category"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [uniqueIndex("idx_template_name").on(table.name)]
);

export async function tableInit() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS mail_template (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      lang_code TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      is_enabled INTEGER NOT NULL,
      remark TEXT,
      creator_id INTEGER NOT NULL,
      updater_id INTEGER,
      create_time_utc INTEGER DEFAULT (
        CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
        CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
      ),
      update_time_utc INTEGER
    )
  `);
  console.log("💾 表 mail_template 已初始化");
}

export default mailTemplateTable;
