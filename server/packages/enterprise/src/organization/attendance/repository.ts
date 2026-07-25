import db from "@hodor/core/db/index";
import { attendanceTable, type AttendancePOLike } from "./model";
import { registry } from "@hodor/admin/common/registry.js";
import { eq, and, or, like, asc, desc, count, type SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  status?: 0 | 1 | 2 | 3;
  employeeId?: number;
  date?: string;
}) {
  const { keyword, status, employeeId, date } = condition || {};
  const conditions: SQL<unknown>[] = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(like(attendanceTable.remark, `%${keyword}%`)) as SQL<unknown>
    );
  }
  if (status !== undefined) {
    conditions.push(eq(attendanceTable.status, status));
  }
  if (employeeId !== undefined) {
    conditions.push(eq(attendanceTable.employeeId, employeeId));
  }
  if (hasValue(date)) {
    conditions.push(eq(attendanceTable.date, date as string));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof AttendancePOLike;
  descend?: boolean;
  keyword?: string;
  status?: 0 | 1 | 2 | 3;
  employeeId?: number;
  date?: string;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = attendanceTable[orderBy] || attendanceTable.id;
  return await db
    .select()
    .from(attendanceTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(10000);
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof AttendancePOLike;
  descend?: boolean;
  keyword?: string;
  status?: 0 | 1 | 2 | 3;
  employeeId?: number;
  date?: string;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = attendanceTable[orderBy] || attendanceTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(attendanceTable.id).as("total") })
    .from(attendanceTable)
    .where(where);

  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const rows = await db
    .select()
    .from(attendanceTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  const employeeIds = Array.from(
    new Set(
      rows
        .map((r) => r.employeeId)
        .filter((id): id is number => id !== undefined && id !== null)
    )
  );

  const userMap =
    employeeIds.length > 0
      ? await registry.system.getUserNameMapByIds(employeeIds)
      : {};

  const list = rows.map((attendance) => {
    const { employeeId, ...rest } = attendance;
    const employeeName = employeeId ? userMap[employeeId] : undefined;
    return {
      ...rest,
      employeeObj: {
        value: employeeId,
        label: employeeName || `Unknown(${employeeId})`,
      },
    };
  });

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const { employeeId, ...rest } = row;
  const employeeName =
    employeeId !== undefined && employeeId !== null
      ? await registry.system.getUserNameById(employeeId)
      : undefined;

  return {
    ...rest,
    employeeObj: {
      value: employeeId,
      label: employeeName || `Unknown(${employeeId})`,
    },
  };
}

export async function onInsert(data: InferInsertModel<typeof attendanceTable>) {
  const result = await db
    .insert(attendanceTable)
    .values(data)
    .returning({ id: attendanceTable.id });
  return result[0]?.id;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof attendanceTable>, "id">>
) {
  const result = await db
    .update(attendanceTable)
    .set(data)
    .where(eq(attendanceTable.id, id))
    .returning({ id: attendanceTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(attendanceTable)
    .where(eq(attendanceTable.id, id))
    .returning({ id: attendanceTable.id });
  return result[0] || null;
}
