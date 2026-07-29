import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'voice' as const;
export const PREFIX_LV3 = 'config' as const;
export const FULL_PREFIX = 'admin.voice.config' as const;
export const THIS_PERMISSION = permissions.admin.voice.config;
