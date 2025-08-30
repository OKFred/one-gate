import type { App } from "@/types/app.ts";
import { serve } from "@hono/node-server";

export default function nodeServer(app: App) {
    // 启动服务器
    const PORT = Number(process.env.PORT) || 3000;
    setTimeout(() => {
        serve({
            port: PORT,
            fetch: app.fetch,
        });
        console.log(`Server listening on http://localhost:${PORT}`);
    }, 0);
}
