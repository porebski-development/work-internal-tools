import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json' with { type: 'json' };

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        // Dodatkowe entry points jeśli potrzebne
      },
      output: {
        // Upewniamy się że wszystko jest w jednym pliku dla content script
        inlineDynamicImports: false,
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return '[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    // Nie minifikujemy w dev, minifikujemy w prod
    minify: process.env.NODE_ENV === 'production',
  },
  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@modules': '/src/modules',
    },
  },
  // HMR dla rozszerzenia Chrome
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});
