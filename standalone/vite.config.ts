import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';
export default defineConfig({
  root: resolve(__dirname),
  publicDir: false,
  plugins: [viteSingleFile()],
  build: { outDir: resolve(__dirname, '../dist'), emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false },
});
