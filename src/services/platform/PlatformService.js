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

  /**
   * Prompt the user for a save location and write the recipe there.
   * @param {Object} data
   * @param {string} suggestedName
   * @returns {Promise<string|null>} chosen path/name, or null if canceled
   */
  async saveRecipeAs(data, suggestedName = 'recipe.json') {
    if (this.isElectron) {
      return window.electronAPI.saveRecipeAs(data, suggestedName)
    }
    if (window.showSaveFilePicker) {
      let handle
      try {
        handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'Recipe JSON', accept: { 'application/json': ['.json'] } }]
        })
      } catch (err) {
        if (err.name === 'AbortError') return null
        throw err
      }
      const writable = await handle.createWritable()
      await writable.write(JSON.stringify(data, null, 2))
      await writable.close()
      return handle.name
    }
    // Fallback for browsers without the File System Access API: trigger a download.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = suggestedName
    link.click()
    URL.revokeObjectURL(url)
    return suggestedName
  }

  /**
   * Prompt the user to pick a recipe file and read it.
   * @returns {Promise<{fileName: string, data: Object}|null>} null if canceled
   */
  async openRecipe() {
    if (this.isElectron) {
      return window.electronAPI.openRecipe()
    }
    if (window.showOpenFilePicker) {
      let handle
      try {
        [handle] = await window.showOpenFilePicker({
          types: [{ description: 'Recipe JSON', accept: { 'application/json': ['.json'] } }]
        })
      } catch (err) {
        if (err.name === 'AbortError') return null
        throw err
      }
      const file = await handle.getFile()
      return { fileName: handle.name, data: JSON.parse(await file.text()) }
    }
    // Fallback for browsers without the File System Access API.
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = async () => {
        const file = input.files[0]
        if (!file) { resolve(null); return }
        try {
          resolve({ fileName: file.name, data: JSON.parse(await file.text()) })
        } catch (err) {
          reject(err)
        }
      }
      input.click()
    })
  }
}
