import db from "@/db/index";
 import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

export const mailTemplateIndex = {
  id: {
    type: "number",
    description: "邮件模板id",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof mailTemplateLike, JSONSchema>>;

export const mailTemplateUnique = {} as const satisfies Partial<
  Record<keyof mailTemplateLike, JSONSchema>
>;

export const mailTemplateData = {
  name: {
    type: "string",
    description: "邮件模板名称",
    examples: ["welcome_email"],
  },
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
    examples: ["这是一个测试邮箱账号"],
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof mailTemplateLike, JSONSchema>>;

export const mailTemplateAudit = {
  creatorId: {
    type: "number",
    description: "创建者ID",
  },
  updaterId: {
    type: "number",
    description: "更新者ID",
    nullable: true,
  },
  createTimeUtc: {
    type: "number",
    description: "创建时间",
    examples: [1672531199000],
  },
  updateTimeUtc: {
    type: "number",
    nullable: true,
    description: "更新时间",
    examples: [1672531199000],
  },
} as const satisfies Partial<Record<keyof mailTemplateLike, JSONSchema>>;

export type mailTemplateLike = InferSelectModel<typeof mailTemplateTable>;
export type mailTemplateAddLike = InferInsertModel<typeof mailTemplateTable>;

export const mailTemplateTable = sqliteTable("mail_template", {
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
});

export async function tableInit() {
  await db.run(`
        CREATE TABLE IF NOT EXISTS mail_template (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
