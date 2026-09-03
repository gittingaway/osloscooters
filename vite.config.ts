import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Set at build time in CI for GitHub Pages, which serves this project
// under /osloscooters/ rather than the domain root. Every other host
// (local dev, Cloudflare Pages) serves from the root and needs no override.
const basePath = process.env.VITE_BASE_PATH ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Oslo Scooters',
        short_name: 'Oslo Scooters',
        description: 'Nearby Voi, Bolt, and Ryde scooters in Oslo, in one place.',
        lang: 'en',
        start_url: basePath,
        scope: basePath,
        display: 'standalone',
        background_color: '#dce6df',
        theme_color: '#dce6df',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Scooter data must always be fresh; only the app shell is cached.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
