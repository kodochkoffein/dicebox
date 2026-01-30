import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  base: process.env.VITE_BASE ?? '/dicebox/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      // Only play/index.html needs JS bundling
      input: {
        play: resolve(__dirname, 'public/play/index.html'),
      },
      output: {
        // Content-hashed filenames for cache-busting (supports "cache forever" strategy)
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
