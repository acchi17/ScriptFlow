import { defineConfig } from 'vite'

// Force a .cjs output extension: sandboxed preload scripts run without an
// ESM context regardless of Electron version, and this project's
// package.json has "type": "module", so a plain .js extension here would be
// misparsed as ESM by Node/Electron.
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
