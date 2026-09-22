import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    chunkSizeWarningLimit: 2000
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.js']
  }
});
