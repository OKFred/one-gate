import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'system' as const;
export const PREFIX_LV3 = 'api_token' as const;
export const FULL_PREFIX = 'admin.system.api_token' as const;
export const THIS_PERMISSION = permissions.admin.system.api_token;
