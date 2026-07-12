import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'personal' as const;
export const PREFIX_LV2 = 'profile' as const;
export const FULL_PREFIX = 'personal.profile' as const;
export const THIS_PERMISSION = permissions.personal.profile;
