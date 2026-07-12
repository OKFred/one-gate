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

export { IndexVO };

//====================================================================
// Browser PO, VO & Table
//====================================================================

export const BrowserBasePO = {
  name: {
    type: "string",
    description: "配置名",
    maxLength: 100,
  },
  cdpUrl: {
    type: "string",
    description:
      "CDP 协议调试连接地址 (e.g. ws://127.0.0.1:9222/devtools/browser/... 或调试主机:端口)",
  },
  isDefault: {
    type: "boolean",
    description: "是否为默认环境",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注信息",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof BrowserPOLike, JSONSchema>>;

export const BrowserVO = {
  ...IndexVO,
  ...BrowserBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof BrowserVOLike, JSONSchema>>;

export const BrowserAddVO = BrowserBasePO;
export const BrowserUpdateVO = {
  ...IndexVO,
  ...BrowserBasePO,
} as const satisfies Partial<Record<keyof BrowserVOLike, JSONSchema>>;

export type BrowserPOLike = InferSelectModel<typeof browserTable>;
type BrowserSelectPOLike = InferInsertModel<typeof browserTable>;
export type BrowserAddPOLike = Omit<
  BrowserPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
export type BrowserUpdatePOLike = Partial<
  Omit<BrowserSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<BrowserPOLike, IndexKeyLike>;

export type BrowserVOLike = BrowserPOLike;

export const BrowserAddKeys = [
  "name",
  "cdpUrl",
  "isDefault",
  "isEnabled",
] as const satisfies RequiredKeys<BrowserAddPOLike>[];
export const BrowserUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BrowserUpdatePOLike>[];
export const BrowserDeleteKeys = [...IndexKey] as const satisfies RequiredKeys<
  Pick<BrowserPOLike, IndexKeyLike>
>[];
export const BrowserGetKeys = [...IndexKey] as const satisfies RequiredKeys<
  Pick<BrowserPOLike, IndexKeyLike>
>[];
export const BrowserListKeys = [
  ...IndexKey,
  "name",
  "cdpUrl",
  "isDefault",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<BrowserVOLike>[];

export const BrowserSortableKeys = [
  "id",
  "name",
  "isDefault",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<BrowserPOLike>[];

export const browserTable = sqliteTable("infra_browser", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  cdpUrl: text("cdp_url").notNull(),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});
