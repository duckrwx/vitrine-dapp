import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.json'],
  json: {
    namedExports: false,
    stringify: false
  },
  server: {
    port: 5173,
    host: true
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
})
