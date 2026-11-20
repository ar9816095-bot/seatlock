import { transformSync } from '@babel/core';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite 8 / @vitejs/plugin-react v6 integration for React Compiler (`babel-plugin-react-compiler`).
 */
function reactCompilerVitePlugin(): Plugin {
  return {
    name: 'seatlock-react-compiler',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/src/') || !/\.[tj]sx$/.test(id)) return null;
      const result = transformSync(code, {
        filename: id,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        parserOpts: {
          plugins: ['typescript', 'jsx'],
        },
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      });
      if (!result?.code) return null;
      return {
        code: result.code,
        map: result.map ?? null,
      };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      reactCompilerVitePlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'offline.html'],
        manifest: {
          id: '/',
          name: 'SEATLOCK — University Event Seat Booking',
          short_name: 'SEATLOCK',
          description:
            'Your Seat. Your Choice. Zero Chaos. AI-powered university event seat-booking platform.',
          theme_color: '#090E1C',
          background_color: '#090E1C',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Explicitly NEVER cache auth endpoints or live seat availability endpoints
            {
              urlPattern: /\/(auth|seats|hold|holds|ai\/assist)/i,
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          // VitePWA's dev SW registration sends HMR messages via import.meta.hot.send(),
          // which throws when HMR is disabled (DISABLE_HMR=true). Keep enabled whenever HMR is active.
          enabled: process.env.DISABLE_HMR !== 'true',
          type: 'module',
        },
      }),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
