import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'mobile' as const;
export const PREFIX_LV3 = 'device_app' as const;
export const FULL_PREFIX = 'admin.mobile.device_app' as const;
export const THIS_PERMISSION = permissions.admin.mobile.device_app;
