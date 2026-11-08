import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/eterra-survivors/',
  build: { chunkSizeWarningLimit: 1600 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
