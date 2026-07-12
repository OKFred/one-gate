import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'i18n' as const;
export const PREFIX_LV3 = 'region' as const;
export const FULL_PREFIX = 'admin.i18n.region' as const;
export const THIS_PERMISSION = permissions.admin.i18n.region;
