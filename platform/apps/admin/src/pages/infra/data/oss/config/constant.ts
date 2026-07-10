import { PREFIX_LV1 } from '../../../constant';
import { PREFIX_LV2 } from '../../constant';
import { PREFIX_LV3 } from '../constant';
import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV4 = 'config' as const;
export const FULL_PREFIX = `${PREFIX_LV1}.${PREFIX_LV2}.${PREFIX_LV3}.${PREFIX_LV4}` as const;
export const THIS_PERMISSION = permissions[PREFIX_LV1][PREFIX_LV2][PREFIX_LV3][PREFIX_LV4];
