import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'enterprise' as const;
export const PREFIX_LV2 = 'tenant' as const;
export const FULL_PREFIX = 'enterprise.tenant' as const;
export const THIS_PERMISSION = permissions.enterprise.tenant;
