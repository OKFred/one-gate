/** 命名空间前缀 */
export const PREFIX_LV1 = 'infra' as const;
import { permissions } from '@/hooks/usePermission';
export const THIS_PERMISSION = permissions[PREFIX_LV1];
