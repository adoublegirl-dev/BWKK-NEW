import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5172,
    proxy: {
      '/api': {
        target: 'http://localhost:5090',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5090',
        changeOrigin: true,
      },
    },
  },
})
