import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "./",
  base: "./",
  publicDir: "public",
  server: {
    host: "127.0.0.1",
    port: 3000,
    open: false,
    strictPort: false,
  },
  preview: {
    host: "127.0.0.1",
    port: 3001,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
