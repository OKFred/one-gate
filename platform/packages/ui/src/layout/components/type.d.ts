import * as SystemMenuAPI from '@/api/admin/system/menu';

export type SystemMenuTreeRequest = NonNullable<Parameters<typeof SystemMenuAPI.treeFn>[0]['data']>;
export type SystemMenuTreeResponse = Awaited<ReturnType<typeof SystemMenuAPI.treeFn>>;
export type SystemMenuTrees = NonNullable<SystemMenuTreeResponse['data']['data']>;
export type SystemMenuTree = SystemMenuTrees[number];
