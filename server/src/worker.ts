import createApp from "@/server/index";
import { setD1Binding } from "@/db/index";
import { setEnv } from "@/utils/env";

let app: any = null;

export default {
  /**
   * Cloudflare Workers fetch handler.
   */
  async fetch(request: Request, env: any, ctx: any) {
    // 1. Inject bindings into the database layer before any app initialization happens.
    // This allows tableInit() during route registration to correctly use D1.
    if (env.DB) {
      setD1Binding(env.DB);
    }

    // 2. Set environment variables globally
    setEnv(env);

    // 3. Initialize the app instance as a singleton for efficiency.
    // In Workers, this isolate may be reused for multiple requests.
    if (!app) {
      app = createApp();
    }

    // 4. Handle the request via Hono.
    // Hono will correctly populate c.env for each individual request.
    return app.fetch(request, env, ctx);
  },
};
