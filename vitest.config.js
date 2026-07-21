import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}', 'server/**/*.mjs'],
      // main.jsx = reiner Mount; index.mjs startet den Server beim Import
      // (Integration laeuft real via CI-Build + Deploy-Healthcheck).
      exclude: ['src/main.jsx', 'server/index.mjs', '**/*.test.*'],
      reporter: ['text-summary', 'text'],
    },
  },
})
