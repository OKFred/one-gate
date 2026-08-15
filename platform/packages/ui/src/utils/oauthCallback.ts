/** Map the fixed provider callback path into the application's HashRouter route. */
export function getOAuthHashBridgeUrl(location: Pick<Location, 'origin' | 'pathname' | 'search'>) {
  if (location.pathname !== '/oauth/callback') return null;
  return `${location.origin}/#/oauth/callback${location.search}`;
}
