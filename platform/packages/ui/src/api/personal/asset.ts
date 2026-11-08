import { axiosPlus, type AxiosConfig } from '@/api/config';

type OverviewConfig = AxiosConfig<'/api/v1/personal/asset/overview', 'post'>;
type PlaceConfig = AxiosConfig<'/api/v1/personal/asset/place', 'post'>;

export const overviewFn = (config: Omit<OverviewConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/asset/overview', method: 'post', ...config });

export const placeFn = (config: Omit<PlaceConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/asset/place', method: 'post', ...config });

export type AssetOverview = Awaited<ReturnType<typeof overviewFn>>['data']['data'];
export type PersonalAsset = AssetOverview['assets'][number];
export type AssetPlacement = PersonalAsset['placement'];
export type PlaceInput = NonNullable<PlaceConfig['data']>;
