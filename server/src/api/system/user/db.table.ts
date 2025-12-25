import db from "@/db/index";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";

export const userIndex = {
  id: {
    type: "number",
    description: "用户id",
    examples: [1],
  },
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;

export const userUnique = {
  username: {
    type: "string",
    description: "用户名",
    examples: ["user"],
  },
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;
export const userOmitPasswordData = {
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US", "zh-CN"],
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    default: true,
  },
  departmentId: {
    type: "number",
    description: "部门ID",
    examples: [1],
  },
  roleIdArr: {
    type: "array",
    description: "角色ID数组",
    items: {
      type: "number",
      examples: [1],
    },
  },
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;
export const userOmitPasswordVOData = {
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US", "zh-CN"],
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    default: true,
  },
  departmentObj: {
    type: "object",
    description: "部门对象",
    properties: {
      value: { type: "number", description: "部门ID", examples: [1] },
      label: { type: "string", description: "部门名称", examples: ["研发部"] },
    },
    required: ["value", "label"],
    additionalProperties: false,
  },
  roleArr: {
    type: "array",
    description: "角色数组",
    items: {
      type: "object",
      properties: {
        value: { type: "number", description: "角色ID", examples: [1] },
        label: {
          type: "string",
          description: "角色名称",
          examples: ["管理员"],
        },
      },
      required: ["value", "label"],
      additionalProperties: false,
    },
  },
} as const satisfies Partial<Record<keyof userVOLike, JSONSchema>>;
export const userData = {
  password: {
    type: "string",
    description: "密码",
    examples: ["pass"],
  },
  ...userOmitPasswordData,
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;
export const userVOData = {
  password: {
    type: "string",
    description: "密码",
    examples: ["pass"],
  },
  langCode: {
    type: "string",
    description: "语言代码",
    examples: ["en-US", "zh-CN"],
  },
  departmentObj: {
    type: "object",
    description: "部门对象",
    properties: {
      value: { type: "number", description: "部门ID", examples: [1] },
      label: { type: "string", description: "部门名称", examples: ["研发部"] },
    },
    required: ["value", "label"],
    additionalProperties: false,
  },
  roleArr: {
    type: "array",
    description: "角色数组",
    items: {
      type: "object",
      properties: {
        value: { type: "number", description: "角色ID", examples: [1] },
        label: {
          type: "string",
          description: "角色名称",
          examples: ["管理员"],
        },
      },
      required: ["value", "label"],
      additionalProperties: false,
    },
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
    default: true,
  },
} as const satisfies Partial<Record<keyof userVOLike, JSONSchema>>;

export const userAudit = {
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
} as const satisfies Partial<Record<keyof userLike, JSONSchema>>;

type userDataDerived = {
  departmentObj?: {
    value: number;
    label: string;
  };
  roleArr: {
    value: number;
    label: string;
  }[];
};
export type userLike = InferSelectModel<typeof userTable>;
export type userAddLike = InferInsertModel<typeof userTable>;
export type userVOLike = Omit<
  InferSelectModel<typeof userTable>,
  "roleIdArr" | "departmentId"
> &
  userDataDerived;
export type userAddVOLike = Omit<
  InferInsertModel<typeof userTable>,
  "roleIdArr" | "departmentId"
> &
  userDataDerived;

export const userTable = sqliteTable("system_user", {
  id: integer("id").primaryKey().notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  langCode: text("lang_code").notNull(),
  departmentId: integer("department_id"),
  roleIdArr: text("role_id_arr", { mode: "json" }).$type<number[]>().notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export async function tableInit() {
  await db.run(`
        CREATE TABLE IF NOT EXISTS system_user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            lang_code TEXT NOT NULL,
            department_id INTEGER,
            role_id_arr TEXT NOT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            create_time_utc INTEGER DEFAULT (
              CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
              CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
            ),
            update_time_utc INTEGER
        )
    `);
  console.log("💾 表 system_user 已初始化");
}

export default userTable;
