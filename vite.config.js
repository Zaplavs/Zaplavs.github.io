import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        forma: fileURLToPath(new URL('./projects/forma.html', import.meta.url)),
        coffee: fileURLToPath(new URL('./projects/coffee.html', import.meta.url)),
        beauty: fileURLToPath(new URL('./projects/beauty.html', import.meta.url)),
      },
    },
  },
});
