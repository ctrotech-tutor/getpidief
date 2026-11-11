import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "preview-app/.next/**",
    "preview-app/out/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores to reduce lint warnings:
    "tests/**",
    "test/**",
    "**/*.test.*",
    "**/*.spec.*",
    "scripts/**",
    "node_modules/**",
    "coverage/**",
    ".git/**",
    "dist/**",
    "*.config.js",
    "*.config.mjs",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "public/pdf.worker.min.mjs",
  ]),
  {
    rules: {
      // Allow explicit any types for flexibility
      "@typescript-eslint/no-explicit-any": "off",
      // Allow unused variables (common in development)
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow unescaped entities in emails
      "react/no-unescaped-entities": "off",
      // Allow img tags for external images
      "@next/next/no-img-element": "off",
      // Allow setState in effects for simple cases
      "react-hooks/set-state-in-effect": "warn",
      // Allow incompatible library warnings (React Hook Form, etc.)
      "react-hooks/incompatible-library": "warn",
      // Allow missing dependencies in useEffect for simple cases
      "react-hooks/exhaustive-deps": "warn",
      // Allow aria-expanded on input elements
      "jsx-a11y/role-supports-aria-props": "warn",
    },
  },
]);

export default eslintConfig;
