import { defineConfig } from 'vite';

// base './' lets the build work on GitHub Pages under /<repo>/ without extra config.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
