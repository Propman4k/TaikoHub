import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3005,
    proxy: {
      '/api': { target: process.env.API_TARGET || 'http://127.0.0.1:3006', changeOrigin: true },
    },
  },
})
