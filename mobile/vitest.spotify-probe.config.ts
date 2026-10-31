import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["experiments/spotify-web/*.test.mjs"],
    environment: "node",
  },
});
