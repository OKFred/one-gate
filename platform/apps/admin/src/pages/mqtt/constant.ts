import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'mqtt' as const;
export const FULL_PREFIX = 'admin.mqtt' as const;
export const THIS_PERMISSION = permissions.admin.mqtt;
