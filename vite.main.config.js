import { defineConfig } from 'vite'

// Force a .cjs output extension so the bundle is parsed as CommonJS by
// Node/Electron regardless of this project's package.json "type": "module".
// @electron-forge/plugin-vite's own default for this build family emits a
// .js extension unconditionally, which would otherwise be treated as ESM.
// NOTE: supplying `build.lib` here would make the plugin skip injecting its
// own `entry`, breaking the build entirely — only override the output name
// via rollupOptions.output, which the plugin's library-mode build respects.
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
