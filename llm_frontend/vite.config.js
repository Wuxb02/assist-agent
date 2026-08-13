import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 构建产物由后端 FastAPI 挂载到 / 路径，故 base 使用绝对路径 '/'
export default defineConfig({
  base: '/',
  plugins: [vue()],
  server: {
    port: 5173,
    // 开发环境将 API 请求代理到后端服务
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
