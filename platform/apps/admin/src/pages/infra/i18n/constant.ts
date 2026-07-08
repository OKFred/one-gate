import { PREFIX_LV1 } from '../constant';
import { permissions } from '@/hooks/usePermission';

/** 命名空间前缀 */
export const PREFIX_LV2 = 'i18n';

export const FULL_PREFIX = `${PREFIX_LV1}.${PREFIX_LV2}`;

export const THIS_PERMISSION = permissions[PREFIX_LV1][PREFIX_LV2];
