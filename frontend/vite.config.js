import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: "../public",
    emptyOutDir: false, // 设置为false，避免清空emojis目录
  },
  server: {
    proxy: {
      // 代理Socket.IO请求
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
      // 代理API请求
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/emojis": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/cdn-images": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
