import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadEnv } from "dotenv";

// Tests run against a dedicated database (see .env.test / README "Tests"),
// never the dev database, so `npm test` can't clobber demo/seed data.
loadEnv({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
