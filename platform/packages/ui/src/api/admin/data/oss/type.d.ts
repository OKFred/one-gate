import * as OSSConfigAPI from '@/api/admin/data/oss/config';
import * as OSSFileAPI from '@/api/admin/data/oss/file';

export type ListAllConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.listAllFn>[0]['data']>;
export type ListAllConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.listAllFn>>['data']['data'];

export type ListConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.listFn>[0]['data']>;
export type ListConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.listFn>>['data']['data'];

export type GetConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.getFn>[0]['data']>;
export type GetConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.getFn>>['data']['data'];

export type AddConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.addFn>[0]['data']>;
export type AddConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.addFn>>['data']['data'];

export type UpdateConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.updateFn>[0]['data']>;
export type UpdateConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.updateFn>>['data']['data'];

export type DeleteConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.deleteFn>[0]['data']>;
export type DeleteConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.deleteFn>>['data']['data'];

export type VerifyConfigReq = NonNullable<Parameters<typeof OSSConfigAPI.verifyFn>[0]['data']>;
export type VerifyConfigRes = Awaited<ReturnType<typeof OSSConfigAPI.verifyFn>>['data']['data'];

export type ListFileReq = NonNullable<Parameters<typeof OSSFileAPI.listFn>[0]['data']>;
export type ListFileRes = Awaited<ReturnType<typeof OSSFileAPI.listFn>>['data']['data'];

export type ListDirectoryFileReq = NonNullable<
  Parameters<typeof OSSFileAPI.listDirectoryFn>[0]['data']
>;
export type ListDirectoryFileRes = Awaited<
  ReturnType<typeof OSSFileAPI.listDirectoryFn>
>['data']['data'];

export type DeleteFileReq = NonNullable<Parameters<typeof OSSFileAPI.deleteFn>[0]['data']>;
export type DeleteFileRes = Awaited<ReturnType<typeof OSSFileAPI.deleteFn>>['data']['data'];
