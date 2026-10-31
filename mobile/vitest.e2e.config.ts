import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.e2e.test.ts"],
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
