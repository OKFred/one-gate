import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'ai' as const;
export const PREFIX_LV3 = 'chat' as const;
export const FULL_PREFIX = 'admin.ai.chat' as const;
export const THIS_PERMISSION = permissions.admin.ai.chat;
