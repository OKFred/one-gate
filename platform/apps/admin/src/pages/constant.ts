/** 命名空间前缀 */
import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const THIS_PERMISSION = permissions[PREFIX_LV1];
