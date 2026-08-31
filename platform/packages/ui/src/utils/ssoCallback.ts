export type SsoCallbackIntent = 'login' | 'bind';

export function getSsoCallbackUrl(origin: string, intent: SsoCallbackIntent) {
  const url = new URL('/sso/callback', origin);
  url.searchParams.set('intent', intent);
  return url.toString();
}

/** Map the fixed identity callback path into the application's HashRouter route. */
export function getSsoHashBridgeUrl(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  if (location.pathname !== '/sso/callback') return null;
  return `${location.origin}/#${location.pathname}${location.search}`;
}
