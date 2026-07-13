import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'oss' as const;
export const PREFIX_LV3 = 'config' as const;
export const FULL_PREFIX = 'admin.oss.config' as const;
export const THIS_PERMISSION = permissions.admin.oss.config;
