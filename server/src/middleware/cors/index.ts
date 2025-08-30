import type { App } from "@/types/app.ts";
import { cors } from "hono/cors";

export default function corsHandler(app: App) {
    app.use("/api/*", cors());
}
