import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'ai' as const;
export const PREFIX_LV3 = 'search' as const;
export const FULL_PREFIX = 'admin.ai.search' as const;
export const THIS_PERMISSION = permissions.admin.ai.search;
