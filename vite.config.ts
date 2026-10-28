import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ORION Campaign Intelligence',
        short_name: 'ORION',
        description: 'El Centro Neuronal de Campaña con IA.',
        theme_color: '#0A1628',
        background_color: '#0A1628',
        display: 'standalone',
        icons: [
          {
            src: 'https://i.ibb.co/qLGmzCyZ/orion-logo-png.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://i.ibb.co/qLGmzCyZ/orion-logo-png.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'https://i.ibb.co/qLGmzCyZ/orion-logo-png.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
