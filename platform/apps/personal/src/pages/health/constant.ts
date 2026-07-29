import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'personal' as const;
export const PREFIX_LV2 = 'health' as const;
export const FULL_PREFIX = 'personal.health' as const;
export const THIS_PERMISSION = permissions.personal.health;
