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
        console.log(`🚀 服务器已启动： http://localhost:${PORT}`);
    }, 0);
}
