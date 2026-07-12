import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'mail' as const;
export const PREFIX_LV3 = 'account' as const;
export const FULL_PREFIX = 'admin.mail.account' as const;
export const THIS_PERMISSION = permissions.admin.mail.account;
