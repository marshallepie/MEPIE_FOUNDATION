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
        deletedRecords: resolve(__dirname, 'deleted-records.html'),
        document: resolve(__dirname, 'governing-document.html'),
        policies: resolve(__dirname, 'policies.html'),
        contact: resolve(__dirname, 'contact.html'),
        donate: resolve(__dirname, 'donate.html'),
        donateSuccess: resolve(__dirname, 'donate-success.html'),
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  server: {
    // Use default port 5173 for Netlify Dev compatibility
    open: false, // Don't auto-open, Netlify Dev will handle this
  },
});
