import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    // Must not use 8080 — Spring Boot dev server binds there. Same-origin /api via proxy avoids CORS issues.
    port: 8100,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/content": { target: "http://127.0.0.1:8080", changeOrigin: true },
      "/management": { target: "http://127.0.0.1:8080", changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
