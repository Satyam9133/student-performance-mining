import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The React dev server forwards /api/* to the Flask backend, so the frontend
// can simply call fetch('/api/...') without worrying about CORS or ports.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:5000' } },
})
