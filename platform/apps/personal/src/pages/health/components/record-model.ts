import dayjs from 'dayjs';
import { classifyApiFailure, type AxiosConfig } from '@/api/config';
import type * as HealthAPI from '@/api/personal/health';

type AddHealthReq = NonNullable<
  AxiosConfig<'/api/v1/personal/health/medical_record/add', 'post'>['data']
>;
type ListHealthReq = NonNullable<
  AxiosConfig<'/api/v1/personal/health/medical_record/list', 'post'>['data']
>;
type ListHealthRes = Awaited<ReturnType<typeof HealthAPI.listFn>>['data']['data'];

export type MedicalRecord = NonNullable<ListHealthRes['list']>[number];
export type MedicalCategory = NonNullable<ListHealthReq['category']>;
export const categories = [
  'outpatient',
  'hospitalization',
  'exam',
  'prescription',
  'vaccination',
] as const satisfies readonly MedicalCategory[];

export function safeReportUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function healthFailure(failure: unknown): string | null {
  const result = classifyApiFailure(failure);
  if (result.kind === 'session') return null;
  if (result.kind !== 'business') return 'personal.health.writeUnknown';
  if (result.code === 'NOT_EXIST_OR_DISABLED') return 'personal.health.notFound';
  if (result.code === 'PERMISSION_DENIED') return 'errorHandler.permissionDenied';
  return 'personal.health.writeFailed';
}

export function visitDate(value: number | undefined): string {
  return value !== undefined && Number.isFinite(value) ? dayjs(value).format('YYYY-MM-DD') : '';
}

export type HealthFormData = Required<
  Pick<
    AddHealthReq,
    | 'category'
    | 'title'
    | 'hospitalName'
    | 'doctorName'
    | 'visitDateUtc'
    | 'diagnosis'
    | 'prescription'
    | 'reportUrl'
    | 'remark'
  >
> &
  Pick<AddHealthReq, 'cost'>;
