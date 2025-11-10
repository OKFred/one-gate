import db from "@/db/index";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";

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
  status: integer("status", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(
      sql`(CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))`
    ),
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
            status INTEGER NOT NULL DEFAULT 1,
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
  console.log("Mail template table initialized");
}

export default mailTemplateTable;
