import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    name: "workers",
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "pino": path.resolve(__dirname, "./test/mocks/pino.ts"),
    },
    include: [
      "src/**/*.spec.ts",
      "src/**/*.workers.spec.ts"
    ],
    exclude: ["**/*.node.spec.ts"],
  },
  ssr: {
    noExternal: true,
  },
});


