import axios from 'axios';

export interface ApiFailure {
  kind: 'business' | 'unknown' | 'session';
  code: string | null;
  message: string | null;
}

export function readErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || !('data' in data)) return undefined;
  const payload = data.data;
  if (!payload || typeof payload !== 'object' || !('code' in payload)) return undefined;
  return typeof payload.code === 'string' ? payload.code : undefined;
}

/** A transport error cannot prove that the database mutation failed to commit. */
export function classifyApiFailure(error: unknown): ApiFailure {
  if (axios.isCancel(error)) return { kind: 'session', code: null, message: null };
  // HTTP 200 + ok:false rejects with the Axios response, not an AxiosError.
  const response: unknown = axios.isAxiosError(error) ? error.response : error;
  if (
    !response ||
    typeof response !== 'object' ||
    !('status' in response) ||
    !('data' in response)
  ) {
    return { kind: 'unknown', code: null, message: null };
  }
  const status = response.status;
  const body = response.data;
  const code = readErrorCode(body) ?? null;
  const message =
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : null;
  // Only 401 is handled by the global authentication flow. A TOTP service outage
  // (503) or throttling response (429) must still be presented by the action owner.
  if (status === 401) return { kind: 'session', code, message };
  if (
    typeof status === 'number' &&
    status >= 200 &&
    status < 500 &&
    code &&
    body &&
    typeof body === 'object' &&
    'ok' in body &&
    body.ok === false
  ) {
    return { kind: 'business', code, message };
  }
  return { kind: 'unknown', code, message };
}
