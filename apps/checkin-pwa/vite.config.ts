import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'UniHub Check-in',
        short_name: 'CheckIn',
        description: 'UniHub Workshop Check-in PWA for staff',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/checkin\/preload\/.+/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'checkin-preload',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\/api\/workshops/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'workshops-list',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 5, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
