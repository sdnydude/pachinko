import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  root: resolve(__dirname),
  publicDir: false,
  build: { outDir: resolve(__dirname, '../dist'), emptyOutDir: true, assetsInlineLimit: 1024 * 1024 },
});
