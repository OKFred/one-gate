import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'base' as const;
export const PREFIX_LV3 = 'sys_config' as const;
export const FULL_PREFIX = 'admin.base.sys_config' as const;
export const THIS_PERMISSION = permissions.admin.base.sys_config;
