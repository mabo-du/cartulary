import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cartulary/',
  build: { outDir: 'dist', emptyOutDir: true },
});
