import path from "path";
import { fileURLToPath } from "url";
import type { App, AppBindings } from "@/types/app.d";
import subFolderBatchRegister from "@/api/subFolderBatchRegister";
import { OpenAPIHono } from "@hono/zod-openapi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname, __filename, path.basename(__filename));

async function createApp(): Promise<App> {
  const app = new OpenAPIHono<AppBindings>();
  const _app = await subFolderBatchRegister(app, "/", __dirname);
  return _app;
}
export default createApp;
