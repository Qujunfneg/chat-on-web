import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [vue()],
    define: {
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || 'ChatOnWeb'),
    },
    build: {
      outDir: "../public",
      emptyOutDir: false, // 设置为false，避免清空emojis目录
    },
    server: {
      proxy: {
        // 代理Socket.IO请求
        "/socket.io": {
          target: "http://localhost:3000",
          ws: true,
          changeOrigin: true,
        },
        // 代理API请求
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/emojis": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/cdn-images": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
