import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["./vitest.config.workers.mts", "./vitest.config.node.mts"],
  },
});
