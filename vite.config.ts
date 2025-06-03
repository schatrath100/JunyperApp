import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    watch: {
      // Increase debounce time to prevent rapid restarts
      restartDebounce: 300
    },
    // Add hmr configuration to make hot module replacement more stable
    hmr: {
      timeout: 5000
    }
  }
});
