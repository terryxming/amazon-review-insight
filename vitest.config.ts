import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "amazon-review-insight/tests/**/*.test.ts"],
    globals: true
  }
});
