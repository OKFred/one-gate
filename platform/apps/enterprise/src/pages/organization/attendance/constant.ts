import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'enterprise' as const;
export const PREFIX_LV2 = 'organization' as const;
export const PREFIX_LV3 = 'attendance' as const;
export const FULL_PREFIX = 'enterprise.organization.attendance' as const;
export const THIS_PERMISSION = permissions.enterprise.organization.attendance;
