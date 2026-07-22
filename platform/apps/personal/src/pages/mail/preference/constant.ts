import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'personal' as const;
export const PREFIX_LV2 = 'mail' as const;
export const PREFIX_LV3 = 'preference' as const;
export const FULL_PREFIX = 'personal.mail.preference' as const;
export const THIS_PERMISSION = permissions.personal.mail.preference;
