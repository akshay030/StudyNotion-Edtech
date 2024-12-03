import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API requests to the backend server on port 4000
      '/api': 'http://localhost:4000', // Backend URL
    },
  },
})
