const callbackPaths = new Set(['/oauth/callback', '/sso/callback']);

/** Map a fixed identity callback path into the application's HashRouter route. */
export function getAuthHashBridgeUrl(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  if (!callbackPaths.has(location.pathname)) return null;
  return `${location.origin}/#${location.pathname}${location.search}`;
}

/** @deprecated Use getAuthHashBridgeUrl for OAuth and SSO callbacks. */
export function getOAuthHashBridgeUrl(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  return getAuthHashBridgeUrl(location);
}
