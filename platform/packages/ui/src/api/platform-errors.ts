import { common as english } from '../locales/en-US/common';
import { common as chinese } from '../locales/zh-CN/common';
import { readErrorCode } from './failure';

const platformMessageKeys = {
  CLOUDFLARE_D1_DAILY_READ_LIMIT: 'error.cloudflareD1DailyReadLimit',
  CLOUDFLARE_D1_DAILY_WRITE_LIMIT: 'error.cloudflareD1DailyWriteLimit',
  CLOUDFLARE_D1_STORAGE_LIMIT: 'error.cloudflareD1StorageLimit',
  CLOUDFLARE_KV_QUOTA_EXCEEDED: 'error.cloudflareKvQuotaExceeded',
  CLOUDFLARE_KV_RATE_LIMITED: 'error.cloudflareKvRateLimited',
  CLOUDFLARE_WORKERS_DAILY_LIMIT: 'error.cloudflareWorkersDailyLimit',
  CLOUDFLARE_WORKERS_RESOURCE_LIMIT: 'error.cloudflareWorkersResourceLimit',
} as const;

type PlatformErrorCode = keyof typeof platformMessageKeys;
type LocalMessageKey = keyof typeof english & keyof typeof chinese;

function isPlatformCode(value: string | undefined): value is PlatformErrorCode {
  return value !== undefined && Object.hasOwn(platformMessageKeys, value);
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name && typeof value === 'string') return value;
  }
  return undefined;
}

function workersCode(value: string | undefined): PlatformErrorCode | undefined {
  if (value === '1027') return 'CLOUDFLARE_WORKERS_DAILY_LIMIT';
  if (value === '1102') return 'CLOUDFLARE_WORKERS_RESOURCE_LIMIT';
  return undefined;
}

/** Read only explicit provider evidence; a 429, cf-ray or Cloudflare server alone proves no quota. */
export function readPlatformErrorCode(
  data: unknown,
  status?: number,
  headers?: unknown,
): PlatformErrorCode | undefined {
  if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
    const code = readErrorCode(data);
    if (isPlatformCode(code)) return code;
  }
  if (status === undefined || status < 400) return undefined;

  // Cloudflare documents these as headers of platform-generated error pages.
  const origin = headerValue(headers, 'cf-error-origin');
  const type = headerValue(headers, 'cf-error-type');
  if (origin?.trim()) {
    const code = workersCode(type?.trim());
    if (code) return code;
  }

  // Some edge responses expose the page but not diagnostic headers. Do not parse arbitrary
  // messages or numbers: require the standard Cloudflare error-page structure and title.
  if (typeof data !== 'string' || data.length > 65_536) return undefined;
  if (!/<title>[^<]*Cloudflare[^<]*<\/title>/iu.test(data)) return undefined;
  if (!/\bid\s*=\s*["']cf-error-details["']/iu.test(data)) return undefined;
  const headings = data.match(/<(?:title|h[12])\b[^>]*>[\s\S]*?<\/(?:title|h[12])>/giu);
  const text = (headings?.join(' ') ?? '').replace(/<[^>]*>/gu, ' ').replace(/\s+/gu, ' ');
  return workersCode(/\berror(?:\s+code)?\s*:?\s+(1027|1102)\b/iu.exec(text)?.[1]);
}

export interface ApiErrorMessageOptions {
  data: unknown;
  status?: number;
  headers?: unknown;
  hasResponse: boolean;
  langCode?: string;
  translate: (key: string) => string;
  fallbackMessage: string;
}

/** Adapter fallback is bundled locally so login/bootstrap failures need no translation request. */
export function resolveApiErrorMessage(options: ApiErrorMessageOptions): string {
  const local = options.langCode?.toLowerCase().startsWith('zh') ? chinese : english;
  const message = (key: LocalMessageKey) => {
    const translated = options.translate(key);
    return translated === key ? local[key] : translated;
  };
  const platformCode = readPlatformErrorCode(options.data, options.status, options.headers);
  if (platformCode) return message(platformMessageKeys[platformCode]);
  if (!options.hasResponse) return message('error.networkOrServiceUnavailable');

  const data = options.data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    if (
      data.message === 'errorHandler.unknownError' ||
      data.message === 'errorHandler.undefinedError' ||
      data.message === 'errorHandler.serverError'
    ) {
      return message('error.serverUnavailable');
    }
    if (data.message) return options.translate(data.message);
  }
  if (options.status === 429) return message('error.requestRateLimited');
  if (options.status !== undefined && options.status >= 500) {
    return message('error.serverUnavailable');
  }
  return options.fallbackMessage;
}
