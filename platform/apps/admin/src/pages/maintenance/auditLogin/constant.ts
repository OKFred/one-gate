import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'maintenance' as const;
export const PREFIX_LV3 = 'audit_login' as const;
export const FULL_PREFIX = 'admin.maintenance.audit_login' as const;
export const THIS_PERMISSION = permissions.admin.maintenance.audit_login;
