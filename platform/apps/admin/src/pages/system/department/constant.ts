import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'system' as const;
export const PREFIX_LV3 = 'department' as const;
export const FULL_PREFIX = 'admin.system.department' as const;
export const THIS_PERMISSION = permissions.admin.system.department;
