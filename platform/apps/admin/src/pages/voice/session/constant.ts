import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'voice' as const;
export const PREFIX_LV3 = 'session' as const;
export const FULL_PREFIX = 'admin.voice.session' as const;
export const THIS_PERMISSION = permissions.admin.voice.session;
