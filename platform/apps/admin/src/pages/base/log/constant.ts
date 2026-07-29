import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'base' as const;
export const PREFIX_LV3 = 'log' as const;
export const FULL_PREFIX = 'admin.base.log' as const;
export const THIS_PERMISSION = permissions.admin.base.log;
