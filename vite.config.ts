import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: process.cwd(),
  build: {
    rollupOptions: {
      input: resolve(process.cwd(), 'index.html')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});