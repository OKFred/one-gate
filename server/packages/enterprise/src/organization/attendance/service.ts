import {
  AttendanceVO,
  AttendanceListKeys,
  AttendanceGetKeys,
  AttendanceAddKeys,
  AttendanceUpdateKeys,
  AttendanceSortableKeys,
  type AttendancePOLike,
  type AttendanceVOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { RequiredKeys } from "@hodor/core/types/app";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import type { UserObj } from "@hodor/core/types/app.js";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { preventTimeTravel } from "./prevention";
import * as attendanceRepository from "./repository";

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
  return await attendanceRepository.findPageAll(params);
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
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await attendanceRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
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

  const insertedId = await attendanceRepository.onInsert({
    employeeId,
    date,
    checkInTime,
    checkOutTime,
    status,
    remark,
    creatorId,
  });

  return insertedId || null;
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

  const row = await attendanceRepository.onUpdate(id, {
    employeeId,
    date,
    checkInTime,
    checkOutTime,
    status,
    remark,
    updaterId,
    updateTimeUtc: Date.now(),
  });
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
  const row = await attendanceRepository.onDelete(id);
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
  const row = await attendanceRepository.findById(id);
  preventEmpty(row);
  return row;
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
