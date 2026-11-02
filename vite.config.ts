import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ORION Campaign Intelligence',
        short_name: 'ORION',
        theme_color: '#0A1628',
        background_color: '#0A1628',
        display: 'standalone'
      }
    }),
    sentryVitePlugin({
      org: "invervasco",
      project: "orion-electoral",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Esto evita que falle si aún no has puesto el token en Vercel
      disable: !process.env.SENTRY_AUTH_TOKEN, 
    }),
  ],
  build: {
    sourcemap: true, // Necesario para Sentry
  },
});
