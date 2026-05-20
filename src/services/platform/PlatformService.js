/**
 * PlatformService
 *
 * Thin facade for file I/O that routes between the Electron and browser builds.
 * - In Electron, methods delegate to window.electronAPI (exposed via preload).
 * - In the browser, methods fall back to fetch() against /settings (Vite serves
 *   the public/ directory at the site root). The browser build is read-only
 *   for block definitions.
 *
 * Note: script execution branching is handled inside JavaScriptExecutionEngine,
 * not here, so this service stays focused on file I/O.
 */
export default class PlatformService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI
  }

  async readBlockDefinitions() {
    if (this.isElectron) {
      return window.electronAPI.readBlockDefinitions()
    }
    else {
      const res = await fetch('/settings/BlockDefinitions.json')
      if (!res.ok) {
        throw new Error(`Failed to load BlockDefinitions.json: HTTP ${res.status}`)
      }
      return res.json()
    }
  }

  async writeBlockDefinitions(data) {
    if (this.isElectron) {
      return window.electronAPI.writeBlockDefinitions(data)
    }
    throw new Error('writeBlockDefinitions is not supported in the browser build')
  }

  async listScripts() {
    if (this.isElectron) {
      return window.electronAPI.listScripts()
    }
    return []
  }

  async saveScript(name, content) {
    if (this.isElectron) {
      return window.electronAPI.saveScript(name, content)
    }
    throw new Error('saveScript is not supported in the browser build')
  }
}
