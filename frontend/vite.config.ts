/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  // onnxruntime-web WASM must not be prebundled — VAD loads it from CDN.
  optimizeDeps: {
    exclude: ["onnxruntime-web", "@ricky0123/vad-web"],
  },
  assetsInclude: ["**/*.onnx", "**/*.wasm"],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
