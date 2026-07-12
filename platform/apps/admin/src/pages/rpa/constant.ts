import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'rpa' as const;
export const FULL_PREFIX = 'admin.rpa' as const;
export const THIS_PERMISSION = permissions.admin.rpa;
