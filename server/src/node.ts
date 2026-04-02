import createApp from "@/server/index";
import nodeServer from "@/middleware/nodeServer/index";
import { getRuntimeKey } from "hono/adapter";

function main() {
  const app = createApp();
  if (getRuntimeKey() !== "workerd") {
    nodeServer(app);
  }
}
main();
