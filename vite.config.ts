import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Temporalmente sin PWA para evitar errores en desarrollo
export default defineConfig({
  plugins: [
    react()
    // VitePWA temporalmente desactivado
  ],
  base: '/LectorEpub/',
  server: {
    host: true,
    strictPort: true,
    allowedHosts: true
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true
  }
})
