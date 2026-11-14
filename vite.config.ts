import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // `node server/server.mjs` (PORT=8787) serves the dev-mode API during `npm run dev`.
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
