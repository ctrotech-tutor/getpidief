import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  test: {
    environment: "jsdom",
    globals:     true,
    setupFiles:  [resolve(__dirname, "./tests/setup.ts")],

    // Coverage
    coverage: {
      provider:   "v8",
      reporter:   ["text", "json", "html"],
      include:    ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/index.ts",
        "src/types/**",
      ],
      thresholds: {
        lines:      70,
        functions:  70,
        branches:   60,
        statements: 70,
      },
    },

    // Test file patterns
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],

    // Exclude e2e (handled by Playwright)
    exclude: ["tests/e2e/**", "node_modules/**"],
  },

  resolve: {
    alias: {
      "@":            resolve(__dirname, "./src"),
      "@components":  resolve(__dirname, "./src/components"),
      "@lib":         resolve(__dirname, "./src/lib"),
      "@hooks":       resolve(__dirname, "./src/hooks"),
      "@stores":      resolve(__dirname, "./src/stores"),
      "@types":       resolve(__dirname, "./src/types"),
    },
  },
});