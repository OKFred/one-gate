import { defineConfig } from "vite";
import { loadEnv } from "vite";
import path from "path";
import type { ConfigEnv, UserConfig } from "vite";
const pathSrc = path.resolve(__dirname, "src");
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
    let env = {
        SERVER_URL: "",
        VITE_SERVER_URL: "",
    } as {
        SERVER_URL?: string;
        VITE_SERVER_URL?: string;
    };
    if (command === "build") {
        const { SERVER_URL } = process.env;
        env = { SERVER_URL };
    }
    env = { ...env, ...loadEnv(mode, process.cwd()) };
    const result = {
        resolve: {
            alias: {
                "@": pathSrc,
            },
        },
        server: { proxy: {} },
        plugins: [react()],
    };
    if (mode === "development") {
        if (env.SERVER_URL || env.VITE_SERVER_URL) {
            result.server.proxy = {
                "/api": {
                    target: env.SERVER_URL || env.VITE_SERVER_URL,
                    ws: false,
                    changeOrigin: true,
                    // rewrite: (path: string) => path.replace(new RegExp(`^/api`), ""),
                },
            };
        }
    }
    console.log(result.server);
    return result;
});
