import { defineConfig } from "vitest/config";

// No @vitejs/plugin-react: its current major needs a newer Vite than the app
// pins, and esbuild already transforms .tsx using the automatic JSX runtime
// from tsconfig. Fast Refresh is a dev-server concern, irrelevant to tests.
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
