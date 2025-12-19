import type * as DepartmentAPI from '@/api/system/department';

// 获取单个部门
export type GetDepartmentParams = Parameters<typeof DepartmentAPI.getFn>[0];
export type GetDepartmentResponse = Awaited<ReturnType<typeof DepartmentAPI.getFn>>;
export type GetDepartmentReq = NonNullable<GetDepartmentParams['data']>;
export type GetDepartmentData = NonNullable<GetDepartmentResponse['data']>;

// 添加部门
export type AddDepartmentParams = Parameters<typeof DepartmentAPI.addFn>[0]['data'];
export type AddDepartmentResponse = Awaited<ReturnType<typeof DepartmentAPI.addFn>>;
export type AddDepartmentReq = NonNullable<AddDepartmentParams['data']>;
export type AddDepartmentData = NonNullable<AddDepartmentResponse['data']>;

// 更新部门
export type UpdateDepartmentParams = Parameters<typeof DepartmentAPI.updateFn>[0]['data'];
export type UpdateDepartmentResponse = Awaited<ReturnType<typeof DepartmentAPI.updateFn>>;
export type UpdateDepartmentReq = NonNullable<UpdateDepartmentParams['data']>;
export type UpdateDepartmentData = NonNullable<UpdateDepartmentResponse['data']>;

// 删除部门
export type DeleteDepartmentParams = Parameters<typeof DepartmentAPI.deleteFn>[0];
export type DeleteDepartmentResponse = Awaited<ReturnType<typeof DepartmentAPI.deleteFn>>;
export type DeleteDepartmentReq = NonNullable<DeleteDepartmentParams['data']>;
export type DeleteDepartmentData = NonNullable<DeleteDepartmentResponse['data']>;
