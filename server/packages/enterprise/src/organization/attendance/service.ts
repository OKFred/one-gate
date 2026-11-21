import type { FromSchema } from "json-schema-to-ts";
import { enterpriseOrganizationAttendanceBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { UserObj } from "@hodor/core/types/app.js";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { AttendanceSortableKeys, type AttendancePOLike } from "./model";
import { preventTimeTravel } from "./prevention";
import * as attendanceRepository from "./repository";

const S = enterpriseOrganizationAttendanceBackendSchemas;

function toSortableKey(val?: string): keyof AttendancePOLike | undefined {
  return AttendanceSortableKeys.find((k) => k === val);
}

function toAttendanceStatus(val?: number): 0 | 1 | 2 | 3 | undefined {
  if (val === 0 || val === 1 || val === 2 || val === 3) return val;
  return undefined;
}

async function onListAll(
  params: FromSchema<typeof S.listAllReq>,
  _userObj: UserObj
): Promise<FromSchema<typeof S.listAllRes>> {
  return await attendanceRepository.findPageAll({
    status: toAttendanceStatus(params.status),
    employeeId: params.employeeId,
    date: params.date,
    orderBy: toSortableKey(params.orderBy),
    descend: params.descend,
  });
}

async function onList(
  params: FromSchema<typeof S.listReq>,
  _userObj: UserObj
): Promise<FromSchema<typeof S.listRes>> {
  const {
    pageNo = 1,
    pageSize = 10,
    keyword,
    status,
    employeeId,
    date,
  } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await attendanceRepository.findPage({
    pageNo,
    pageSize: finalPageSize,
    orderBy: toSortableKey(params.orderBy),
    descend: params.descend,
    keyword,
    status: toAttendanceStatus(status),
    employeeId,
    date,
  });

  return buildPagedListResult(list, total, pageNo, finalPageSize);
}

async function onAdd(
  params: FromSchema<typeof S.addReq>,
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
    status: toAttendanceStatus(status) ?? 0,
    remark,
    creatorId,
  });

  return insertedId || null;
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number | null> {
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
    status: toAttendanceStatus(status),
    remark,
    updaterId,
    updateTimeUtc: Date.now(),
  });
  preventEmpty(row);
  return row.id;
}

async function onDelete(
  params: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number | null> {
  const { id } = params;
  const row = await attendanceRepository.onDelete(id);
  preventEmpty(row);
  return row.id;
}

async function onGet(
  params: FromSchema<typeof S.getReq>,
  _userObj: UserObj
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = params;
  const row = await attendanceRepository.findById(id);
  preventEmpty(row);
  return row;
}

export default createCrudApis(S, {
  listAll: {
    adapter: bodyUserAdapter,
    summary: "获取所有考勤记录（不分页）",
    handler: onListAll,
  },
  list: {
    adapter: bodyUserAdapter,
    summary: "获取考勤记录列表",
    handler: onList,
  },
  add: {
    summary: "添加考勤记录",
    handler: onAdd,
  },
  update: {
    summary: "更新考勤记录",
    handler: onUpdate,
  },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除考勤记录",
    handler: onDelete,
  },
  get: {
    adapter: bodyUserAdapter,
    summary: "获取考勤记录详情",
    handler: onGet,
  },
});
