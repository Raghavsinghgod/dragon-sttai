import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/stt/**"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        statements: 50,
        branches: 44,
        functions: 47,
        lines: 49,
      },
    },
  },
})
