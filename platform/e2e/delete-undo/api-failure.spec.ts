import { test, expect } from '@playwright/test';
import { classifyApiFailure } from '../../packages/ui/src/api/failure.js';

const rejected = (code: string) => ({ ok: false, message: 'Localized reason', data: { code } });
function httpError(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

test('HTTP 200 business rejection is recognized without an AxiosError wrapper', () => {
  expect(
    classifyApiFailure({ status: 200, data: rejected('errorHandler.department.nameConflict') }),
  ).toEqual({
    kind: 'business',
    code: 'errorHandler.department.nameConflict',
    message: 'Localized reason',
  });
});

test('HTTP 409 AxiosError carries the same stable business code', () => {
  expect(
    classifyApiFailure(httpError(409, rejected('errorHandler.department.invalidParent'))),
  ).toEqual({
    kind: 'business',
    code: 'errorHandler.department.invalidParent',
    message: 'Localized reason',
  });
});

test('5xx remains unknown even when a proxy returns a business-looking code', () => {
  expect(
    classifyApiFailure(httpError(503, rejected('errorHandler.department.nameConflict'))).kind,
  ).toBe('unknown');
});

test('no response, timeout, and malformed response cannot establish mutation failure', () => {
  for (const failure of [
    { isAxiosError: true, code: 'ERR_NETWORK' },
    { isAxiosError: true, code: 'ECONNABORTED' },
    { status: 200, data: '<html>proxy</html>' },
    { status: 409, data: { ok: false } },
    undefined,
  ]) {
    expect(classifyApiFailure(failure).kind).toBe('unknown');
  }
});

test('authentication errors and cancellation remain owned by the session flow', () => {
  for (const failure of [
    { __CANCEL__: true },
    httpError(401, rejected('NOT_AUTHENTICATED')),
    httpError(401, rejected('TOTP_GATE_REQUIRED')),
  ]) {
    expect(classifyApiFailure(failure).kind).toBe('session');
  }
});

test('permission rejection is a business failure, not an expired session', () => {
  expect(classifyApiFailure(httpError(403, rejected('PERMISSION_DENIED'))).kind).toBe('business');
});

test('TOTP outages and throttling are not silently consumed as session transitions', () => {
  expect(classifyApiFailure(httpError(503, rejected('TOTP_GATE_UNAVAILABLE'))).kind).toBe(
    'unknown',
  );
  expect(classifyApiFailure(httpError(429, rejected('TOTP_GATE_RATE_LIMITED'))).kind).toBe(
    'business',
  );
});

test('success-shaped responses and messages alone are not evidence of rejected mutations', () => {
  expect(
    classifyApiFailure({ status: 200, data: { ok: true, data: { code: 'conflict' } } }).kind,
  ).toBe('unknown');
  expect(classifyApiFailure({ status: 409, data: { message: 'Name conflict' } }).kind).toBe(
    'unknown',
  );
});
