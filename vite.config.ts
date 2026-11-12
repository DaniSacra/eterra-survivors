import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/** Stamps public/sw.js with this build's time, so each deploy gets its own cache and the old ones are dropped (PT-02). */
const stampServiceWorker = () => {
  let outDir = 'dist';
  return {
    name: 'stamp-service-worker',
    apply: 'build' as const,
    configResolved: (c: { build: { outDir: string } }) => void (outDir = c.build.outDir),
    writeBundle: () => {
      const file = resolve(outDir, 'sw.js');
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', String(Date.now())));
    },
  };
};

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves under /eterra-survivors/; Render (valmor-resiste.onrender.com) serves from the root (BASE_PATH=/).
  base: loadEnv(mode, '.', '').BASE_PATH || '/eterra-survivors/',
  build: { chunkSizeWarningLimit: 1600 },
  plugins: [stampServiceWorker()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
