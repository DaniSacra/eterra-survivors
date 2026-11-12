import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/** This build's stamp: in the bundle (`__BUILD_ID__`), in sw.js and in version.json, so a running game can tell a newer deploy exists. */
const BUILD = String(Date.now());

/** Stamps public/sw.js with this build's time, so each deploy gets its own cache and the old ones are dropped (PT-02), and writes version.json. */
const stampServiceWorker = () => {
  let outDir = 'dist';
  return {
    name: 'stamp-service-worker',
    apply: 'build' as const,
    configResolved: (c: { build: { outDir: string } }) => void (outDir = c.build.outDir),
    writeBundle: () => {
      const file = resolve(outDir, 'sw.js');
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', BUILD));
      writeFileSync(resolve(outDir, 'version.json'), JSON.stringify({ build: BUILD }));
    },
  };
};

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves under /eterra-survivors/; Render (valmor-resiste.onrender.com) serves from the root (BASE_PATH=/).
  base: loadEnv(mode, '.', '').BASE_PATH || '/eterra-survivors/',
  define: { __BUILD_ID__: JSON.stringify(mode === 'production' ? BUILD : 'dev') },
  build: { chunkSizeWarningLimit: 1600 },
  plugins: [stampServiceWorker()],
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
