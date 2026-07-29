import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'enterprise' as const;
export const PREFIX_LV2 = 'mail' as const;
export const PREFIX_LV3 = 'edm' as const;
export const FULL_PREFIX = 'enterprise.mail.edm' as const;
export const THIS_PERMISSION = permissions.enterprise.mail.edm;
