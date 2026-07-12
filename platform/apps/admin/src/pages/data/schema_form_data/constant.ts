import { permissions } from '@/hooks/usePermission';

export const PREFIX_LV1 = 'admin' as const;
export const PREFIX_LV2 = 'data' as const;
export const PREFIX_LV3 = 'schema_form_data' as const;
export const FULL_PREFIX = 'admin.data.schema_form_data' as const;
export const THIS_PERMISSION = permissions.admin.data.schema_form_data;
