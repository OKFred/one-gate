import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { App, AppBindings, routeLike } from "@/types/app.d";

function getSubAPI(rootFolder = "" as string) {
  const files = fs.readdirSync(rootFolder);
  let indexFilePath: routeLike["indexFilePath"] = "";
  for (const file of files) {
    if (fs.statSync(`${rootFolder}/${file}`).isDirectory()) {
      continue;
    }
    if (/index\.(ts|js)$/.test(file)) {
      indexFilePath = path.join(rootFolder, file);
      break;
    }
  }
  return indexFilePath;
}

async function createApp(
  app: App,
  mountPoint = "/",
  __dirname = ""
): Promise<App> {
  try {
    const routeArr = [] as routeLike[];
    const subFolders = fs.readdirSync(__dirname).filter((folder) => {
      return fs.statSync(`${__dirname}/${folder}`).isDirectory();
    });
    for (const folder of subFolders) {
      const indexFilePath = getSubAPI(`${__dirname}/${folder}`);
      if (indexFilePath) routeArr.push({ indexFilePath, namespace: folder });
    }
    const _app = new OpenAPIHono<AppBindings>();
    for (const route of routeArr) {
      const createSubApp = await import(
        pathToFileURL(route.indexFilePath).href
      ).then((mod) => mod.default);
      const subApp = await createSubApp();
      _app.route(`/${route.namespace}`, subApp);
    }
    app.route(mountPoint, _app);
  } catch (error) {
    console.error("Error in subFolderBatchRegister:", error);
  }
  return app;
}
export default createApp;
