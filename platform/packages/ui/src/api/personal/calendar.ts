import { axiosPlus, type AxiosConfig } from '@/api/config';

type ListConfig = AxiosConfig<'/api/v1/personal/calendar/list', 'post'>;
type GetConfig = AxiosConfig<'/api/v1/personal/calendar/get', 'post'>;
type AddConfig = AxiosConfig<'/api/v1/personal/calendar/add', 'post'>;
type UpdateConfig = AxiosConfig<'/api/v1/personal/calendar/update', 'post'>;
type CancelConfig = AxiosConfig<'/api/v1/personal/calendar/cancel', 'post'>;
type DueConfig = AxiosConfig<'/api/v1/personal/calendar/due', 'post'>;
type AckConfig = AxiosConfig<'/api/v1/personal/calendar/ack', 'post'>;

export const listFn = (config: Omit<ListConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/list', method: 'post', ...config });

export const getFn = (config: Omit<GetConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/get', method: 'post', ...config });

export const addFn = (config: Omit<AddConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/add', method: 'post', ...config });

export const updateFn = (config: Omit<UpdateConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/update', method: 'post', ...config });

export const cancelFn = (config: Omit<CancelConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/cancel', method: 'post', ...config });

export const dueFn = (config?: Omit<DueConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/due', method: 'post', data: {}, ...config });

export const ackFn = (config: Omit<AckConfig, 'url' | 'method'>) =>
  axiosPlus({ url: '/api/v1/personal/calendar/ack', method: 'post', ...config });

export type CalendarEvent = Awaited<ReturnType<typeof getFn>>['data']['data'];
export type CalendarList = Awaited<ReturnType<typeof listFn>>['data']['data'];
export type CalendarDue = Awaited<ReturnType<typeof dueFn>>['data']['data'];
export type CalendarListResponse = CalendarList;
export type CalendarDueResponse = CalendarDue;
export type CalendarAddInput = NonNullable<AddConfig['data']>;
export type CalendarUpdateInput = NonNullable<UpdateConfig['data']>;
