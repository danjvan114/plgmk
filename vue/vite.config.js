import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8897',
      '/uploads': 'http://localhost:8897',
      '/vendor': 'http://localhost:8897',
      '/css': 'http://localhost:8897',
      '/favicon.ico': 'http://localhost:8897'
    }
  }
});
