import { defineConfig, mergeConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    // e2e-tests/ holds Playwright specs (run via `npm run test:e2e`), not Vitest unit tests
    exclude: [...configDefaults.exclude, 'e2e-tests/**']
  }
}))
