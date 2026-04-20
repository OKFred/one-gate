import * as AttendanceAPI from '@/api/enterprise/attendance';

// ==================== Enterprise Attendance ====================

/** 获取所有考勤记录请求 */
export type ListAllAttendanceReq = NonNullable<
  Parameters<typeof AttendanceAPI.listAllFn>[0]['data']
>;
/** 获取所有考勤记录响应 */
export type ListAllAttendanceRes = Awaited<
  ReturnType<typeof AttendanceAPI.listAllFn>
>['data']['data'];

/** 获取考勤记录列表请求 */
export type ListAttendanceReq = NonNullable<Parameters<typeof AttendanceAPI.listFn>[0]['data']>;
/** 获取考勤记录列表响应 */
export type ListAttendanceRes = Awaited<ReturnType<typeof AttendanceAPI.listFn>>['data']['data'];

/** 获取考勤记录详情请求 */
export type GetAttendanceReq = NonNullable<Parameters<typeof AttendanceAPI.getFn>[0]['data']>;
/** 获取考勤记录详情响应 */
export type GetAttendanceRes = Awaited<ReturnType<typeof AttendanceAPI.getFn>>['data']['data'];

/** 添加考勤记录请求 */
export type AddAttendanceReq = NonNullable<Parameters<typeof AttendanceAPI.addFn>[0]['data']>;
/** 添加考勤记录响应 */
export type AddAttendanceRes = Awaited<ReturnType<typeof AttendanceAPI.addFn>>['data']['data'];

/** 更新考勤记录请求 */
export type UpdateAttendanceReq = NonNullable<Parameters<typeof AttendanceAPI.updateFn>[0]['data']>;
/** 更新考勤记录响应 */
export type UpdateAttendanceRes = Awaited<
  ReturnType<typeof AttendanceAPI.updateFn>
>['data']['data'];

/** 删除考勤记录请求 */
export type DeleteAttendanceReq = NonNullable<Parameters<typeof AttendanceAPI.deleteFn>[0]['data']>;
/** 删除考勤记录响应 */
export type DeleteAttendanceRes = Awaited<
  ReturnType<typeof AttendanceAPI.deleteFn>
>['data']['data'];

/** 考勤记录条目 */
export type AttendanceObj = ListAttendanceRes['list'][number];
