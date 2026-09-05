import { authUtils } from './auth';

const RETURN_TARGET_KEY = 'hodor:primary-auth-return-target';

function readLocationParameter(name: string): string | null {
  const search = new URLSearchParams(window.location.search);
  if (search.has(name)) return search.get(name);
  const queryIndex = window.location.hash.indexOf('?');
  if (queryIndex < 0) return null;
  return new URLSearchParams(window.location.hash.slice(queryIndex + 1)).get(name);
}

function allowedReturnOrigins(): ReadonlySet<string> {
  const configured = [
    window.location.origin,
    import.meta.env.VITE_ADMIN_URL,
    import.meta.env.VITE_ENTERPRISE_URL,
    import.meta.env.VITE_PERSONAL_URL,
  ];
  const origins = configured.flatMap((value) => {
    if (!value) return [];
    try {
      return [new URL(value, window.location.origin).origin];
    } catch {
      return [];
    }
  });
  return new Set(origins);
}

export function rememberPrimaryAuthReturnTarget(): void {
  const candidate = readLocationParameter('redirect');
  if (!candidate) return;
  try {
    const target = new URL(candidate);
    if (
      (target.protocol === 'https:' || target.protocol === 'http:') &&
      allowedReturnOrigins().has(target.origin)
    ) {
      sessionStorage.setItem(RETURN_TARGET_KEY, target.toString());
    }
  } catch {
    sessionStorage.removeItem(RETURN_TARGET_KEY);
  }
}

export function completePrimaryAuthReturn(): boolean {
  const target = sessionStorage.getItem(RETURN_TARGET_KEY);
  sessionStorage.removeItem(RETURN_TARGET_KEY);
  const token = authUtils.getUserInfo()?.token;
  if (!target || !token) return false;
  try {
    const destination = new URL(target);
    if (!allowedReturnOrigins().has(destination.origin)) return false;
    destination.searchParams.set('token', token);
    window.location.assign(destination.toString());
    return true;
  } catch {
    return false;
  }
}

export function clearPrimaryAuthReturnTarget(): void {
  sessionStorage.removeItem(RETURN_TARGET_KEY);
}

export function readTransferredToken(): string | null {
  return readLocationParameter('token');
}
