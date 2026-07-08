import { PREFIX_LV1 } from '../constant';
import { permissions } from '@/hooks/usePermission';

/** 命名空间前缀 */
export const PREFIX_LV2 = 'workflow_config';

// 这里的 schema 没有 .workflow_config 这一级，而是直接跟在 enterprise 下
export const FULL_PREFIX = PREFIX_LV1;

export const THIS_PERMISSION = permissions[PREFIX_LV1][PREFIX_LV2];
