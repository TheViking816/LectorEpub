import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Lector EPUB',
        short_name: 'Lector EPUB',
        description: 'Lector EPUB',
        start_url: '/LectorEpub/',
        scope: '/LectorEpub/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
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
