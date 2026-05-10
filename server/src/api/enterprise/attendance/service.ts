import db from "@/db/index";
import {
  attendanceTable,
  AttendanceVO,
  AttendanceListKeys,
  AttendanceGetKeys,
  AttendanceAddKeys,
  AttendanceUpdateKeys,
  AttendanceSortableKeys,
  type AttendancePOLike,
  type AttendanceVOLike,
} from "./model";
import { userTable } from "@/api/system/user/model";
import { asc, count, desc, eq, or, like, and, inArray } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import type { UserObj } from "@/api/system/user/service";
import { preventEmpty } from "@/middleware/auth/prevention";
import { preventTimeTravel } from "./prevention";

// 构建查询条件
const buildWhereCondition = ({
  keyword,
  status,
  employeeId,
  date,
}: {
  keyword?: string;
  status?: number;
  employeeId?: number;
  date?: string;
}) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(attendanceTable.remark, `%${keyword}%`)));
  }
  if (status !== undefined) {
    conditions.push(eq(attendanceTable.status, status));
  }
  if (employeeId !== undefined) {
    conditions.push(eq(attendanceTable.employeeId, employeeId));
  }
  if (hasValue(date)) {
    conditions.push(eq(attendanceTable.date, date));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    status: AttendanceVO["status"],
    employeeId: AttendanceVO["employeeId"],
    date: AttendanceVO["date"],
    orderBy: orderByWrapper<(keyof AttendancePOLike)[]>(AttendanceSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...AttendanceVO,
    },
    required: ["id", "employeeId", "date", "status"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>,
  userObj: UserObj
): Promise<FromSchema<typeof listAllRes>> {
  const { orderBy = "id", descend = true } = params;
  const orderField = attendanceTable[orderBy] || attendanceTable.id;
  const rows = await db
    .select()
    .from(attendanceTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(10000);

  return rows.map((row) => ({
    ...row,
    employeeObj: null, // Simplified for listAll or handle it if needed
  })) as any;
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有考勤记录（不分页）",
  } as const,
  adapter: bodyUserAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    status: AttendanceVO["status"],
    employeeId: AttendanceVO["employeeId"],
    date: AttendanceVO["date"],
    orderBy: orderByWrapper<(keyof AttendancePOLike)[]>(AttendanceSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<AttendanceVOLike>[]>(
    {
      ...AttendanceVO,
    },
    [...AttendanceListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>,
  userObj: UserObj
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = attendanceTable[orderBy] || attendanceTable.id;

  const countResult = await db
    .select({ total: count(attendanceTable.id).as("total") })
    .from(attendanceTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return {
      total: 0,
      totalPage: 0,
      currentPage: pageNo,
      pageSize,
      list: [],
    };
  }

  const rows = await db
    .select({
      attendance: attendanceTable,
      employeeName: userTable.username,
    })
    .from(attendanceTable)
    .leftJoin(userTable, eq(attendanceTable.employeeId, userTable.id))
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  const list = rows.map(({ attendance, employeeName }) => {
    const { employeeId, ...rest } = attendance;
    return {
      ...rest,
      employeeObj: {
        value: employeeId,
        label: employeeName || `Unknown(${employeeId})`,
      },
    };
  });

  return {
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
    list,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取考勤记录列表",
  } as const,
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

const addReq = {
  type: "object",
  properties: {
    ...AttendanceVO,
  },
  required: [...AttendanceAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = {
  type: "number",
} as const satisfies JSONSchema;

async function onAdd(
  params: any, // Simplified for brevity in writing, can be typed strictly
  userObj: UserObj
): Promise<number | null> {
  const { userId: creatorId } = userObj;
  const { employeeId, date, checkInTime, checkOutTime, status, remark } =
    params;

  // 校验时间冲突
  preventTimeTravel({ checkInTime, checkOutTime });

  const res = await db
    .insert(attendanceTable)
    .values({
      employeeId,
      date,
      checkInTime,
      checkOutTime,
      status,
      remark,
      creatorId,
    })
    .returning({ id: attendanceTable.id });

  return res[0]?.id || null;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: {
    path: "/add",
    method: "post",
    summary: "添加考勤记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

const updateReq = {
  type: "object",
  properties: {
    ...AttendanceVO,
  },
  required: [...AttendanceUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(params: any, userObj: UserObj): Promise<number | null> {
  const { userId: updaterId } = userObj;
  const { id, employeeId, date, checkInTime, checkOutTime, status, remark } =
    params;

  // 校验时间冲突
  preventTimeTravel({ checkInTime, checkOutTime });

  const res = await db
    .update(attendanceTable)
    .set({
      employeeId,
      date,
      checkInTime,
      checkOutTime,
      status,
      remark,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(attendanceTable.id, id))
    .returning({ id: attendanceTable.id });
  const [row] = res;
  preventEmpty(row);
  return row.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: {
    path: "/update",
    method: "post",
    summary: "更新考勤记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

const deleteReq = {
  type: "object",
  properties: {
    id: AttendanceVO.id,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<number | null> {
  const { id } = params;
  const res = await db
    .delete(attendanceTable)
    .where(eq(attendanceTable.id, id))
    .returning({ id: attendanceTable.id });

  const [row] = res;
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: deleteReq,
  res: addRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除考勤记录",
  } as const,
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

const getReq = {
  type: "object",
  properties: {
    id: AttendanceVO.id,
  },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...AttendanceVO,
  },
  required: ["id", "employeeId", "date", "status"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>,
  userObj: UserObj
): Promise<any> {
  const { id } = params;
  const rows = await db
    .select({
      attendance: attendanceTable,
      employeeName: userTable.username,
    })
    .from(attendanceTable)
    .leftJoin(userTable, eq(attendanceTable.employeeId, userTable.id))
    .where(eq(attendanceTable.id, id))
    .limit(1);

  const [row] = rows;
  preventEmpty(row);

  const { attendance, employeeName } = row;
  const { employeeId, ...rest } = attendance;

  return {
    ...rest,
    employeeObj: {
      value: employeeId,
      label: employeeName || `Unknown(${employeeId})`,
    },
  };
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取考勤记录详情",
  } as const,
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
};
