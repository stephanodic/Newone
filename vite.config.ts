/// <reference types="vitest" />
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { readFileSync } from 'fs';
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // IMPORTANT: must be null when using useRegisterSW — 'auto' creates a
        // second Workbox instance that auto-reloads and races the React hook,
        // preventing onNeedReload from ever showing the update banner.
        injectRegister: null,
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          name: 'MoneyTrack',
          short_name: 'MoneyTrack',
          description: 'Traccia entrate e uscite, anche offline.',
          theme_color: '#1D9E75',
          background_color: '#1D9E75',
          display: 'standalone',
          orientation: 'portrait',
          id: '/',
          screenshots: [
            { src: 'screenshot-1.png', sizes: '1440x2432', type: 'image/png', form_factor: 'narrow', label: 'Dashboard' },
            { src: 'screenshot-2.png', sizes: '1440x2432', type: 'image/png', form_factor: 'narrow', label: 'Lista' },
            { src: 'screenshot-3.png', sizes: '1440x2432', type: 'image/png', form_factor: 'narrow', label: 'Categorie' },
          ],
          scope: '/',
          start_url: '/',
          icons: [
            { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          skipWaiting: true,
          clientsClaim: true,
          // Remove stale caches from previous SW versions automatically
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              // NetworkOnly: Firestore has its own offline persistence layer;
              // caching these responses here causes "put on Cache" NotFoundErrors
              // when Workbox tries to store opaque/quota-exceeded responses.
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      __APP_VERSION__: JSON.stringify(version),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      modulePreload: { polyfill: true },
      cssCodeSplit: true,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'motion': ['motion/react'],
            'charts': ['recharts'],
            'utils': ['date-fns', 'lucide-react'],
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      globals: true,
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // Ensure ESM packages in node_modules are handled correctly
      server: {
        deps: {
          inline: [/firebase/],
        },
      },
    },
  };
});
