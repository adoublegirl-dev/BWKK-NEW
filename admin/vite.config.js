import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/admin/',
  plugins: [vue()],
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
