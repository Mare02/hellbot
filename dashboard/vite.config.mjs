import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const dashboardRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => ({
  root: dashboardRoot,
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/': `http://127.0.0.1:${process.env.DASHBOARD_PORT || loadEnv(mode, process.cwd(), '').DASHBOARD_PORT || 3001}`,
    },
  },
}));
