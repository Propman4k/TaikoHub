import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })),
  },
  plugins: [react(), tailwindcss()],
  server: {
    port: 3005,
    proxy: {
      '/api': { target: process.env.API_TARGET || 'http://127.0.0.1:3006', changeOrigin: true },
    },
  },
})
