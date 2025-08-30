import path from "path";
import { fileURLToPath } from "url";
import type { App } from "@/types/app.d";
import type { AppBindings } from "@/types/app.d";
import { OpenAPIHono } from "@hono/zod-openapi";
import subFolderBatchRegister from "@/api/subFolderBatchRegister";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createApp(): Promise<App> {
    const app = new OpenAPIHono<AppBindings>();
    const _app = await subFolderBatchRegister(app, "/", __dirname);
    return _app;
}
export default createApp;
