import { defineConfig } from 'vite'

// Force a .cjs output extension (see vite.main.config.js) so the
// utility-process bundle isn't misparsed as ESM under "type": "module".
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
      output: {
        entryFileNames: '[name].cjs'
      }
    }
  }
})
