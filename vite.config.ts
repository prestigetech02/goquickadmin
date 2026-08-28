import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    // Bind IPv4 so http://127.0.0.1:5175 works (default can be ::1-only on Windows)
    host: '127.0.0.1',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
