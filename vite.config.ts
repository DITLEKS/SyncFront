/// <reference types="vitest/config" />
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// В dev все запросы к /api проксируются на бэкенд, чтобы не упираться в CORS.
// В prod базовый URL API берётся из VITE_API_BASE_URL (см. src/api/config.ts).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Стабильные vendor-чанки кешируются браузером независимо от кода приложения.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      // В jsdom fetch требует абсолютный URL; MSW резолвит относительные пути хендлеров
      // против того же origin, поэтому значения должны совпадать.
      environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
      env: { VITE_API_BASE_URL: 'http://localhost:3000' },
      include: ['src/**/*.test.{ts,tsx}'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/api/openapi.d.ts', 'src/test/**', 'src/main.tsx'],
      },
    },
  };
});
