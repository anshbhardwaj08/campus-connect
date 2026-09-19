import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Mirrors client/vite.config.js — see the reasoning there. React and its
// renderer get a chunk of their own so a deploy of panel code does not
// invalidate them in anybody's cache. Only react/react-dom/scheduler: a
// catch-all on node_modules undoes the per-route splitting.
// The built panel is served by the API server at /admin (server/src/app.js),
// so its asset URLs need that prefix. Dev and the e2e suite run it on its own
// port at /, so only the build gets the base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
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
}))
