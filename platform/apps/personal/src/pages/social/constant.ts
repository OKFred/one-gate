import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'personal' as const;
export const PREFIX_LV2 = 'social' as const;
export const FULL_PREFIX = 'personal.social' as const;
export const THIS_PERMISSION = permissions.personal.social;
