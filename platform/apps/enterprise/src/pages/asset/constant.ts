import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'enterprise' as const;
export const PREFIX_LV2 = 'asset' as const;
export const FULL_PREFIX = 'enterprise.asset' as const;
export const THIS_PERMISSION = permissions.enterprise.asset;
