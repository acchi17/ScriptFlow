/**
 * Application Configuration
 *
 * Logical names only — actual filesystem paths are resolved by PlatformService:
 * - Electron: <app-dir>/scripts/*.js, <app-dir>/settings/BlockDefinitions.json
 * - Browser:  /scripts/*.js, /settings/BlockDefinitions.json (served from public/)
 */
export default {
  // Block definition settings
  block: {
    definitionsFile: 'BlockDefinitions.json'
  },
  // Script execution settings
  script: {
    // Default language used throughout the application
    engineName: 'javascript',
    // Logical scripts directory; the actual path is resolved per environment
    scriptsDir: 'scripts'
  }
  // Additional configuration categories can be added in the future
}
