import * as WorkflowAPI from '@/api/biz/enterprise/workflow';
import * as AttendanceAPI from '@/api/biz/enterprise/attendance';

// ==================== Attendance ====================

/** 获取所有考勤记录请求 */
export type ListAllAttendanceReq = NonNullable<
  Parameters<typeof AttendanceAPI.listAllFn>[0]['data']
>;
/** 获取所有考勤记录响应 */
export type ListAllAttendanceRes = Awaited<
  ReturnType<typeof AttendanceAPI.listAllFn>
>['data']['data'];

/** 分页获取考勤记录请求 */
export type ListAttendanceReq = NonNullable<Parameters<typeof AttendanceAPI.listFn>[0]['data']>;
/** 分页获取考勤记录响应 */
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

/** 考勤对象 */
export type AttendanceObj = ListAttendanceRes['list'][number];

// ==================== Workflow ====================

/** 获取所有工作流请求 */
export type ListAllWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.listAllFn>[0]['data']>;
/** 获取所有工作流响应 */
export type ListAllWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.listAllFn>>['data']['data'];

/** 分页获取工作流请求 */
export type ListWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.listFn>[0]['data']>;
/** 分页获取工作流响应 */
export type ListWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.listFn>>['data']['data'];

/** 获取工作流详情请求 */
export type GetWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.getFn>[0]['data']>;
/** 获取工作流详情响应 */
export type GetWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.getFn>>['data']['data'];

/** 添加工作流请求 */
export type AddWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.addFn>[0]['data']>;
/** 添加工作流响应 */
export type AddWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.addFn>>['data']['data'];

/** 更新工作流请求 */
export type UpdateWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.updateFn>[0]['data']>;
/** 更新工作流响应 */
export type UpdateWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.updateFn>>['data']['data'];

/** 删除工作流请求 */
export type DeleteWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.deleteFn>[0]['data']>;
/** 删除工作流响应 */
export type DeleteWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.deleteFn>>['data']['data'];

/** 运行工作流请求 */
export type RunWorkflowReq = NonNullable<Parameters<typeof WorkflowAPI.runFn>[0]['data']>;
/** 运行工作流响应 */
export type RunWorkflowRes = Awaited<ReturnType<typeof WorkflowAPI.runFn>>['data']['data'];

/** 工作流对象 */
export type WorkflowObj = ListWorkflowRes['list'][number];

// ==================== Workflow Log ====================

/** 分页获取工作流日志请求 */
export type ListLogsReq = NonNullable<Parameters<typeof WorkflowAPI.listLogsFn>[0]['data']>;
/** 分页获取工作流日志响应 */
export type ListLogsRes = Awaited<ReturnType<typeof WorkflowAPI.listLogsFn>>['data']['data'];

/** 工作流日志对象 */
export type LogObj = ListLogsRes['list'][number];
