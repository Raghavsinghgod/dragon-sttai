import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**", "src/stt/**"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        statements: 64,
        branches: 58,
        functions: 53,
        lines: 63,
      },
    },
  },
})
