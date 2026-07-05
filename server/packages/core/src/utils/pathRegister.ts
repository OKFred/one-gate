import { App, Context, RawRouteConfig } from "@hodor/core/types/app";

/**
 * @description Register a route to the app
 */
function main(
  app: App,
  pathObj: RawRouteConfig,
  controller: (c: Context) => Promise<Response>
) {
  const { path, method } = pathObj;
  const regExp = /\{(\w+)\}/g;
  const _path = path.replace(regExp, ":$1");
  app[method](_path, controller);
  app.openAPIRegistry.registerPath(pathObj);
  return app;
}

export default main;
