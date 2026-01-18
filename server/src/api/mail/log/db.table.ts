import db from "@/db/index";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

export const mailLogIndex = {
  id: {
    type: "number",
    description: "邮件日志id",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof mailLogLike, JSONSchema>>;

export const mailLogUnique = {} as const satisfies Partial<
  Record<keyof mailLogLike, JSONSchema>
>;

export const mailLogData = {
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
    type: "string",
    description: "邮件模板ID",
  },
  templateParams: {
    type: "string",
    description: "邮件模板参数",
  },
  sendStatus: {
    type: "boolean",
    description: "发送状态",
  },
  exceptionCode: {
    type: "string",
    description: "异常代码",
  },
  exceptionDetails: {
    type: "string",
    description: "异常详情",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    examples: ["这是一个测试邮箱账号"],
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof mailLogLike, JSONSchema>>;

export const mailLogAudit = {
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
} as const satisfies Partial<Record<keyof mailLogLike, JSONSchema>>;

export type mailLogLike = InferSelectModel<typeof mailLogTable>;
export type mailLogAddLike = InferInsertModel<typeof mailLogTable>;

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
    // 复合索引：查询某个收件人的邮件历史（按时间排序）
    index("idx_mail_to_time").on(table.mailTo, table.createTimeUtc),
    // 单列索引：快速查询发送失败的邮件
    index("idx_send_status").on(table.sendStatus),
    // 单列索引：按模板查询发送记录
    index("idx_template_id").on(table.templateId),
    // 单列索引：按时间范围查询日志
    index("idx_create_time").on(table.createTimeUtc),
  ]
);

export async function tableInit() {
  await db.run(`
        CREATE TABLE IF NOT EXISTS mail_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mail_to TEXT NOT NULL,
            mail_from TEXT NOT NULL,
            title TEXT NOT NULL,
            template_id TEXT,
            template_params TEXT,
            send_status INTEGER NOT NULL,
            exception_code TEXT,
            exception_details TEXT,
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

  // 创建索引以优化查询性能
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_mail_to_time ON mail_log(mail_to, create_time_utc)`
  );
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_send_status ON mail_log(send_status)`
  );
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_template_id ON mail_log(template_id)`
  );
  await db.run(
    `CREATE INDEX IF NOT EXISTS idx_create_time ON mail_log(create_time_utc)`
  );

  console.log("💾 表 mail_log 已初始化");
}

export default mailLogTable;
