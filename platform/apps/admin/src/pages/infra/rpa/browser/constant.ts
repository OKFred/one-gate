import { PREFIX_LV1 } from '../../constant';
import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV2 = 'rpa' as const;
export const PREFIX_LV3 = 'browser' as const;
export const FULL_PREFIX = `${PREFIX_LV1}.${PREFIX_LV2}.${PREFIX_LV3}` as const;
export const THIS_PERMISSION = permissions[PREFIX_LV1][PREFIX_LV2][PREFIX_LV3];
