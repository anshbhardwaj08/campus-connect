import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Mirrors client/vite.config.js — see the reasoning there. React and its
// renderer get a chunk of their own so a deploy of panel code does not
// invalidate them in anybody's cache. Only react/react-dom/scheduler: a
// catch-all on node_modules undoes the per-route splitting.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
          ],
        },
      },
    },
  },
})
