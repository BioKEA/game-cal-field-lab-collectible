import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks cache across deploys; app code changes
        // don't invalidate them.
        manualChunks(id: string) {
          if (id.includes('/node_modules/leaflet/') || id.includes('/node_modules/react-leaflet/') || id.includes('/node_modules/@react-leaflet/')) {
            return 'vendor-leaflet'
          }
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
