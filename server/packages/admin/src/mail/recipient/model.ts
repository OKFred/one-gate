import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { IndexPO, AuditPO } from "@hodor/core/db/common/schema";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export interface MailRecipientPOLike {
  id: number;
  email: string;
  name?: string | null;
  scope: "sys" | "biz" | "user";
  tenantId?: number | null;
  userId?: number | null;
  remoteLoginWarn: boolean;
  marketingEdm: boolean;
  tags?: string | null;
  remark?: string | null;
  creatorId?: number | null;
  updaterId?: number | null;
  createTimeUtc: number;
  updateTimeUtc?: number | null;
}

const MailRecipientBasePO = {
  email: {
    type: "string",
    format: "email",
    description: "收件人邮箱地址",
    examples: ["user@example.com"],
  },
  name: {
    type: ["string", "null"],
    nullable: true,
    description: "收件人姓名/称呼",
    examples: ["张三"],
  },
  scope: {
    type: "string",
    enum: ["sys", "biz", "user"],
    description: "作用域：sys(系统级)/biz(企业级)/user(个人级)",
    default: "biz",
  },
  tenantId: {
    type: ["number", "null"],
    description: "租户ID（企业级专用）",
    nullable: true,
  },
  userId: {
    type: ["number", "null"],
    description: "用户ID（系统/个人级专用）",
    nullable: true,
  },
  remoteLoginWarn: {
    type: "boolean",
    description: "是否开启异地登录告警邮件提醒",
    default: true,
  },
  marketingEdm: {
    type: "boolean",
    description: "是否订阅企业营销EDM邮件",
    default: true,
  },
  tags: {
    type: ["string", "null"],
    nullable: true,
    description: "联系人标签分类（JSON字符串）",
    examples: ['["VIP买家", "展会联系人"]'],
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MailRecipientPOLike, JSONSchema>>;

const MailRecipientPO = {
  ...IndexPO,
  ...MailRecipientBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MailRecipientPOLike, JSONSchema>;

export const MailRecipientVO = MailRecipientPO;

export const MailRecipientListReqVO = {
  scope: MailRecipientBasePO.scope,
  tenantId: MailRecipientBasePO.tenantId,
  userId: MailRecipientBasePO.userId,
  keyword: { type: "string", description: "搜索关键词（邮箱/姓名/备注）" },
  remoteLoginWarn: {
    type: "boolean",
    description: "是否开启异地登录告警邮件提醒",
  },
  marketingEdm: { type: "boolean", description: "是否订阅企业营销EDM邮件" },
} as const satisfies Partial<
  Record<keyof MailRecipientPOLike | "keyword", JSONSchema>
>;

export const MailRecipientAddVO = MailRecipientBasePO;
export const MailRecipientAddKeys = [
  "email",
] as const satisfies (keyof MailRecipientPOLike)[];

export const MailRecipientUpdateVO = MailRecipientBasePO;

export const mailRecipientTable = sqliteTable("mail_recipient", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  name: text("name"),
  scope: text("scope").$type<"sys" | "biz" | "user">().notNull().default("biz"),
  tenantId: integer("tenant_id"),
  userId: integer("user_id"),
  remoteLoginWarn: integer("remote_login_warn", { mode: "boolean" })
    .notNull()
    .default(true),
  marketingEdm: integer("marketing_edm", { mode: "boolean" })
    .notNull()
    .default(true),
  tags: text("tags"),
  remark: text("remark"),
  creatorId: integer("creator_id"),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});
