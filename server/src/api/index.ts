import path from "path";
import { fileURLToPath } from "url";
import type { App } from "@/types/app.d";
import subFolderBatchRegister from "@/api/subFolderBatchRegister";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(__dirname, __filename, path.basename(__filename));

async function createApp(app: App): Promise<App> {
  const _app = await subFolderBatchRegister(
    app,
    process.env.BASE_API_PATH,
    __dirname
  );
  return _app;
}
export default createApp;
