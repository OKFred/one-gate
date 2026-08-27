const callbackPaths = new Set(['/oauth/callback', '/sso/callback']);
export type SsoCallbackIntent = 'login' | 'bind';

export function getSsoCallbackUrl(origin: string, intent: SsoCallbackIntent) {
  const url = new URL('/sso/callback', origin);
  url.searchParams.set('intent', intent);
  return url.toString();
}

/** Map a fixed identity callback path into the application's HashRouter route. */
export function getAuthHashBridgeUrl(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  if (!callbackPaths.has(location.pathname)) return null;
  return `${location.origin}/#${location.pathname}${location.search}`;
}

/** @deprecated Use getAuthHashBridgeUrl for OAuth and SSO callbacks. */
export function getOAuthHashBridgeUrl(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  return getAuthHashBridgeUrl(location);
}
