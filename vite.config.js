import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        projects: resolve(__dirname, 'projects.html'),
        governance: resolve(__dirname, 'governance.html'),
        financial: resolve(__dirname, 'financial-transparency.html'),
        document: resolve(__dirname, 'governing-document.html'),
        policies: resolve(__dirname, 'policies.html'),
        contact: resolve(__dirname, 'contact.html'),
        donate: resolve(__dirname, 'donate.html'),
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
