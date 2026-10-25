import type { paths } from '../../../../../packages/ui/src/types/openapi';

type OverviewOperation = paths['/api/v1/admin/maintenance/cloudflare-usage/overview']['post'];
export type Overview = OverviewOperation['responses'][200]['content']['application/json']['data'];
export type Metric = Overview['metrics'][number];
export type HistoryPoint = Overview['history'][number];
export type Cost = Overview['costs'][number];
export type UsageDays = NonNullable<
  NonNullable<OverviewOperation['requestBody']>['content']['application/json']['days']
>;
