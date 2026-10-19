import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const dashboardRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: dashboardRoot,
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
