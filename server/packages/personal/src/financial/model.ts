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

// 收入记录表
export const incomeRecordsTable = sqliteTable("personal_income_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceCategory: text("source_category").notNull(), // salary | investment | bonus | side_hustle | other
  amount: real("amount").notNull(),
  incomeDateUtc: integer("income_date_utc").notNull(),
  payer: text("payer"),
  remark: text("remark"),
  dataTaskId: integer("data_task_id"),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"),
  updaterId: integer("updater_id"),
  updaterName: text("updater_name"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

// 支出记录表
export const expenseRecordsTable = sqliteTable("personal_expense_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  expenseCategory: text("expense_category").notNull(), // housing | daily | medical | entertainment | education | transport
  amount: real("amount").notNull(),
  expenseDateUtc: integer("expense_date_utc").notNull(),
  payee: text("payee"),
  paymentMethod: text("payment_method"), // alipay | wechat | bank_card | cash
  remark: text("remark"),
  dataTaskId: integer("data_task_id"),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"),
  updaterId: integer("updater_id"),
  updaterName: text("updater_name"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

// 数据源配置表
export const financialDataSourcesTable = sqliteTable(
  "personal_financial_data_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceName: text("source_name").notNull(),
    sourceType: text("source_type").notNull(), // api_task | schema_form
    apiTaskId: integer("api_task_id"),
    schemaFormCode: text("schema_form_code"),
    fieldMappingJson: text("field_mapping_json").notNull(),
    syncCron: text("sync_cron"),
    isEnabled: integer("is_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    lastSyncTimeUtc: integer("last_sync_time_utc"),
    creatorId: integer("creator_id").notNull(),
    creatorName: text("creator_name"),
    updaterId: integer("updater_id"),
    updaterName: text("updater_name"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  }
);

export type IncomeRecordPOLike = InferSelectModel<typeof incomeRecordsTable>;
export type ExpenseRecordPOLike = InferSelectModel<typeof expenseRecordsTable>;
export type FinancialDataSourcePOLike = InferSelectModel<
  typeof financialDataSourcesTable
>;

export { IndexVO };

// Income PO/VO
export const IncomeRecordPO = {
  ...IndexPO,
  sourceCategory: {
    type: "string",
    enum: ["salary", "investment", "bonus", "side_hustle", "other"],
  },
  amount: { type: "number" },
  incomeDateUtc: { type: "number" },
  payer: { type: ["string", "null"], nullable: true },
  remark: { type: ["string", "null"], nullable: true },
  dataTaskId: { type: ["number", "null"], nullable: true },
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof IncomeRecordPOLike, JSONSchema>;

export const IncomeRecordAddVO = {
  sourceCategory: IncomeRecordPO.sourceCategory,
  amount: IncomeRecordPO.amount,
  incomeDateUtc: IncomeRecordPO.incomeDateUtc,
  payer: IncomeRecordPO.payer,
  remark: IncomeRecordPO.remark,
  dataTaskId: IncomeRecordPO.dataTaskId,
} as const satisfies Partial<Record<keyof IncomeRecordPOLike, JSONSchema>>;

export const IncomeRecordUpdateVO = {
  id: IndexVO.id,
  ...IncomeRecordAddVO,
} as const satisfies Partial<Record<keyof IncomeRecordPOLike, JSONSchema>>;

// Expense PO/VO
export const ExpenseRecordPO = {
  ...IndexPO,
  expenseCategory: {
    type: "string",
    enum: [
      "housing",
      "daily",
      "medical",
      "entertainment",
      "education",
      "transport",
      "other",
    ],
  },
  amount: { type: "number" },
  expenseDateUtc: { type: "number" },
  payee: { type: ["string", "null"], nullable: true },
  paymentMethod: { type: ["string", "null"], nullable: true },
  remark: { type: ["string", "null"], nullable: true },
  dataTaskId: { type: ["number", "null"], nullable: true },
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof ExpenseRecordPOLike, JSONSchema>;

export const ExpenseRecordAddVO = {
  expenseCategory: ExpenseRecordPO.expenseCategory,
  amount: ExpenseRecordPO.amount,
  expenseDateUtc: ExpenseRecordPO.expenseDateUtc,
  payee: ExpenseRecordPO.payee,
  paymentMethod: ExpenseRecordPO.paymentMethod,
  remark: ExpenseRecordPO.remark,
  dataTaskId: ExpenseRecordPO.dataTaskId,
} as const satisfies Partial<Record<keyof ExpenseRecordPOLike, JSONSchema>>;

export const ExpenseRecordUpdateVO = {
  id: IndexVO.id,
  ...ExpenseRecordAddVO,
} as const satisfies Partial<Record<keyof ExpenseRecordPOLike, JSONSchema>>;

// Data Source PO/VO
export const FinancialDataSourcePO = {
  ...IndexPO,
  sourceName: { type: "string" },
  sourceType: { type: "string", enum: ["api_task", "schema_form"] },
  apiTaskId: { type: ["number", "null"], nullable: true },
  schemaFormCode: { type: ["string", "null"], nullable: true },
  fieldMappingJson: { type: "string" },
  syncCron: { type: ["string", "null"], nullable: true },
  isEnabled: { type: "boolean" },
  lastSyncTimeUtc: { type: ["number", "null"], nullable: true },
  ...AuditPO,
  creatorName: { type: ["string", "null"], nullable: true },
  updaterName: { type: ["string", "null"], nullable: true },
} as const satisfies Record<keyof FinancialDataSourcePOLike, JSONSchema>;

export const FinancialDataSourceAddVO = {
  sourceName: FinancialDataSourcePO.sourceName,
  sourceType: FinancialDataSourcePO.sourceType,
  apiTaskId: FinancialDataSourcePO.apiTaskId,
  schemaFormCode: FinancialDataSourcePO.schemaFormCode,
  fieldMappingJson: FinancialDataSourcePO.fieldMappingJson,
  syncCron: FinancialDataSourcePO.syncCron,
  isEnabled: FinancialDataSourcePO.isEnabled,
} as const satisfies Partial<
  Record<keyof FinancialDataSourcePOLike, JSONSchema>
>;

export const FinancialDataSourceUpdateVO = {
  id: IndexVO.id,
  ...FinancialDataSourceAddVO,
} as const satisfies Partial<
  Record<keyof FinancialDataSourcePOLike, JSONSchema>
>;

export const IncomeRecordListKeys = [
  ...IndexKey,
  "sourceCategory",
  "amount",
  "incomeDateUtc",
  ...AuditKeys,
] as const satisfies RequiredKeys<IncomeRecordPOLike>[];

export const ExpenseRecordListKeys = [
  ...IndexKey,
  "expenseCategory",
  "amount",
  "expenseDateUtc",
  ...AuditKeys,
] as const satisfies RequiredKeys<ExpenseRecordPOLike>[];

export const FinancialDataSourceListKeys = [
  ...IndexKey,
  "sourceName",
  "sourceType",
  "fieldMappingJson",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<FinancialDataSourcePOLike>[];
