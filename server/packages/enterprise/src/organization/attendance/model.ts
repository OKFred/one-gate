import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
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

//----------------- PO ----------------//
export const AttendanceBasePO = {
  employeeId: {
    type: "number",
    description: "员工ID",
    examples: [1],
    minimum: 1,
  },
  date: {
    type: "string",
    description: "考勤日期",
    examples: ["2024-04-18"],
    maxLength: 10,
  },
  checkInTime: {
    type: ["number", "null"],
    nullable: true,
    description: "签到时间",
    examples: [1672531200000],
  },
  checkOutTime: {
    type: ["number", "null"],
    nullable: true,
    description: "签退时间",
    examples: [1672560000000],
  },
  status: {
    type: "number",
    description: "考勤状态 (0:正常, 1:迟到, 2:早退, 3:旷工)",
    enum: [0, 1, 2, 3],
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof AttendancePOLike, JSONSchema>>;

const AttendancePO = {
  ...IndexPO,
  ...AttendanceBasePO,
  ...AuditPO,
} as const satisfies Record<keyof AttendancePOLike, JSONSchema>;

export type AttendancePOLike = InferSelectModel<typeof attendanceTable>;
type AttendanceSelectPOLike = InferInsertModel<typeof attendanceTable>;
type AttendanceAddPOLike = Omit<
  AttendancePOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type AttendanceUpdatePOLike = Partial<
  Omit<AttendanceSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<AttendancePOLike, IndexKeyLike>;

//----------------- DTO ----------------//
const AttendanceEmployeeDTO = {
  employeeObj: {
    type: ["object", "null"],
    nullable: true,
    description: "员工对象",
    properties: {
      value: {
        type: "number",
        description: "员工ID",
        examples: [1],
      },
      label: {
        type: "string",
        description: "员工名称",
        examples: ["张三"],
      },
    },
    required: ["value", "label"],
    additionalProperties: false,
  },
} as const satisfies Partial<Record<string, JSONSchema>>;

type AttendanceDTOLike = {
  employeeObj: FromSchema<(typeof AttendanceEmployeeDTO)["employeeObj"]>;
};

//----------------- VO ----------------//
export { IndexVO };
export const AttendanceVO = {
  ...IndexVO,
  ...AttendanceBasePO,
  ...AttendanceEmployeeDTO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof AttendanceVOLike, JSONSchema>>;

export type AttendanceVOLike = Omit<AttendancePOLike, "employeeId"> &
  AttendanceDTOLike;

//----------------- Required Keys ----------------//
export const AttendanceAddKeys = [
  "employeeId",
  "date",
  "status",
] as const satisfies RequiredKeys<AttendanceAddPOLike>[];

export const AttendanceUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<AttendanceUpdatePOLike>[];

export const AttendanceDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<Pick<AttendancePOLike, IndexKeyLike>>[];

export const AttendanceGetKeys = [...IndexKey] as const satisfies RequiredKeys<
  Pick<AttendancePOLike, IndexKeyLike>
>[];

export const AttendanceListKeys = [
  ...IndexKey,
  "employeeObj",
  "date",
  "status",
  ...AuditKeys,
] as const satisfies RequiredKeys<AttendanceVOLike>[];

export const AttendanceSortableKeys = [
  "id",
  "employeeId",
  "date",
  "status",
  "createTimeUtc",
] as const satisfies RequiredKeys<AttendancePOLike>[];

//----------------- Table ----------------//
export const attendanceTable = sqliteTable("enterprise_attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id").notNull(),
  date: text("date").notNull(),
  checkInTime: integer("check_in_time"),
  checkOutTime: integer("check_out_time"),
  status: integer("status").notNull(),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default attendanceTable;
