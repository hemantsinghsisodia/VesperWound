import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
