import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'swarm' as const;
export const FULL_PREFIX = 'admin.swarm' as const;
export const THIS_PERMISSION = permissions.admin.swarm;
