import { expect, test } from '@playwright/test';
import {
  readPlatformErrorCode,
  resolveApiErrorMessage,
} from '../../packages/ui/src/api/platform-errors.js';
import { classifyApiFailure } from '../../packages/ui/src/api/failure.js';

const unchanged = (key: string) => key;
const rejection = (code: string, message = 'errorHandler.unknownError') => ({
  ok: false,
  message,
  data: { code, details: [] },
});
const edgePage = (code: number) =>
  `<html><head><title>Worker error | Cloudflare</title></head><body><div id="cf-error-details"><h1>Error <span>${code}</span></h1></div></body></html>`;

test('all stable quota codes work independently of a translation cache and server message', () => {
  for (const code of [
    'CLOUDFLARE_D1_DAILY_READ_LIMIT',
    'CLOUDFLARE_D1_DAILY_WRITE_LIMIT',
    'CLOUDFLARE_D1_STORAGE_LIMIT',
    'CLOUDFLARE_KV_QUOTA_EXCEEDED',
    'CLOUDFLARE_KV_RATE_LIMITED',
    'CLOUDFLARE_WORKERS_DAILY_LIMIT',
    'CLOUDFLARE_WORKERS_RESOURCE_LIMIT',
  ]) {
    for (const status of [200, 429, 503]) {
      const options = {
        data: rejection(code),
        status,
        hasResponse: true,
        translate: unchanged,
        fallbackMessage: 'Request failed',
      };
      expect(readPlatformErrorCode(options.data, status)).toBe(code);
      expect(resolveApiErrorMessage(options)).toContain('Cloudflare');
      expect(resolveApiErrorMessage({ ...options, langCode: 'zh-CN' })).not.toMatch(
        /errorHandler\.|error\.cloudflare|Request failed/,
      );
    }
  }
});

test('D1 daily messages identify read versus write and the UTC reset time', () => {
  for (const operation of ['READ', 'WRITE']) {
    const result = resolveApiErrorMessage({
      data: rejection(`CLOUDFLARE_D1_DAILY_${operation}_LIMIT`),
      hasResponse: true,
      translate: unchanged,
      fallbackMessage: 'Request failed',
    });
    expect(result).toContain(`daily ${operation.toLowerCase()} quota`);
    expect(result).toContain('00:00 UTC');
  }
});

test('a loaded local/dynamic translation still overrides bundled adapter fallback', () => {
  const result = resolveApiErrorMessage({
    data: rejection('CLOUDFLARE_KV_RATE_LIMITED'),
    hasResponse: true,
    translate: (key) => (key === 'error.cloudflareKvRateLimited' ? 'Updated local copy' : key),
    fallbackMessage: 'Request failed',
  });
  expect(result).toBe('Updated local copy');
});

test('Cloudflare diagnostic headers distinguish daily request quota and invocation limits', () => {
  expect(
    readPlatformErrorCode('', 503, { 'cf-error-origin': 'workers', 'cf-error-type': '1027' }),
  ).toBe('CLOUDFLARE_WORKERS_DAILY_LIMIT');
  expect(
    readPlatformErrorCode('', 500, { 'CF-Error-Origin': 'workers', 'CF-Error-Type': '1102' }),
  ).toBe('CLOUDFLARE_WORKERS_RESOURCE_LIMIT');
});

test('standard Cloudflare HTML is identified without exposing or rendering provider HTML', () => {
  expect(readPlatformErrorCode(edgePage(1027), 429)).toBe('CLOUDFLARE_WORKERS_DAILY_LIMIT');
  expect(readPlatformErrorCode(edgePage(1102), 500)).toBe('CLOUDFLARE_WORKERS_RESOURCE_LIMIT');
  const result = resolveApiErrorMessage({
    data: edgePage(1102),
    status: 500,
    hasResponse: true,
    translate: unchanged,
    fallbackMessage: 'Request failed',
  });
  expect(result).toContain('CPU or memory');
  expect(result).not.toContain('<');
});

test('status, branding and generic errors do not prove a quota or daily usage exhaustion', () => {
  for (const [data, status, headers] of [
    ['Too Many Requests', 429, { server: 'cloudflare', 'cf-ray': 'test' }],
    ['Cloudflare error 1027', 429, {}],
    ['error code: 1102', 500, {}],
    [
      '<title>Cloudflare proxy</title><div id="cf-error-details"><p>Unrelated error 1102</p></div>',
      500,
      {},
    ],
    [edgePage(1015), 429, {}],
    [edgePage(1101), 500, {}],
    [edgePage(1102), 200, {}],
    ['Origin error', 502, { 'cf-error-origin': 'workers', 'cf-error-type': '1101' }],
    [edgePage(1102) + ' '.repeat(65_536), 500, {}],
    [{ ok: true, data: { code: 'CLOUDFLARE_D1_DAILY_READ_LIMIT' } }, 200, {}],
    [rejection('__proto__'), 503, {}],
  ] as const) {
    expect(readPlatformErrorCode(data, status, headers)).toBeUndefined();
  }
});

test('a network error remains uncertain and never asserts which platform quota was exhausted', () => {
  const result = resolveApiErrorMessage({
    data: undefined,
    hasResponse: false,
    translate: unchanged,
    fallbackMessage: 'Network Error',
  });
  expect(result).toContain('network or service is temporarily unavailable');
  expect(result).toContain('check platform quotas');
  expect(result).not.toMatch(/has reached|exceeded|D1|KV|Workers/);
});

test('legacy untranslated server keys get readable messages without inventing a quota diagnosis', () => {
  const result = resolveApiErrorMessage({
    data: { ok: false, message: 'errorHandler.unknownError', data: { details: [] } },
    status: 500,
    hasResponse: true,
    translate: unchanged,
    fallbackMessage: 'Request failed',
  });
  expect(result).toContain('service is temporarily unavailable');
  expect(result).not.toMatch(/errorHandler|quota|D1/);
});

test('ordinary business messages are preserved and missing messages use the request fallback', () => {
  expect(
    resolveApiErrorMessage({
      data: rejection('PERMISSION_DENIED', 'You cannot edit this record'),
      hasResponse: true,
      translate: unchanged,
      fallbackMessage: 'Request failed',
    }),
  ).toBe('You cannot edit this record');
  expect(
    resolveApiErrorMessage({
      data: null,
      status: 400,
      hasResponse: true,
      translate: unchanged,
      fallbackMessage: 'Request failed',
    }),
  ).toBe('Request failed');
});

test('unclassified HTTP limits and errors are friendly without claiming a platform quota', () => {
  for (const status of [429, 500, 502, 503]) {
    const result = resolveApiErrorMessage({
      data: '<html>Generic proxy failure</html>',
      status,
      hasResponse: true,
      translate: unchanged,
      fallbackMessage: `Request failed with status code ${status}`,
    });
    expect(result).not.toMatch(/quota|D1|KV|Workers|status code|<html>/);
    expect(result).toContain(status === 429 ? 'too frequent' : 'temporarily unavailable');
  }
});

test('friendly 503 quota presentation never makes a mutation outcome certain', () => {
  expect(
    classifyApiFailure({
      isAxiosError: true,
      response: { status: 503, data: rejection('CLOUDFLARE_D1_DAILY_WRITE_LIMIT') },
    }).kind,
  ).toBe('unknown');
});
