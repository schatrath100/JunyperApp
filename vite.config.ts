import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    // Enhance hmr configuration for better responsiveness
    hmr: {
      timeout: 3000,
      overlay: true
    }
  }
});
