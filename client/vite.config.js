import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// React and its renderer are pulled out into a chunk of their own.
//
// This does not shrink the first visit — the same bytes arrive either way.
// It shrinks every visit AFTER a deploy: React is about a third of the
// compressed payload and changes only when we upgrade it, so keeping it in
// its own file means shipping a bug fix no longer invalidates it in
// everybody's cache.
//
// Deliberately only react/react-dom/scheduler. A catch-all on node_modules
// was tried and made things worse: it swept up gsap, zod, react-hook-form
// and the icon set — libraries that only some pages need and that the
// bundler was already placing correctly in per-route chunks — and handed
// them to every page.
export default defineConfig({
  plugins: [react()],
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
