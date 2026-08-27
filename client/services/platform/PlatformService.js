/**
 * PlatformService
 *
 * Facade for file I/O. Under Electron it delegates to window.electronAPI
 * (exposed via preload); under the Web server execution mode it talks to the
 * HTTP API served alongside the UI, except for recipes, which are handled
 * entirely client-side via browser upload/download (no server round trip).
 */
export default class PlatformService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI
  }

  async readBlockDefinitions() {
    if (this.isElectron) return window.electronAPI.readBlockDefinitions()
    return this._fetchJson('/api/settings')
  }

  async writeBlockDefinitions(data) {
    if (this.isElectron) return window.electronAPI.writeBlockDefinitions(data)
    await this._fetchJson('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  async listScripts() {
    if (this.isElectron) return window.electronAPI.listScripts()
    return this._fetchJson('/api/scripts')
  }

  async saveScript(name, content) {
    if (this.isElectron) return window.electronAPI.saveScript(name, content)
    await this._fetchJson(`/api/scripts/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: content
    })
  }

  /**
   * Save the recipe. Under Electron this opens a native save dialog; under
   * the Web server mode it triggers a browser download (no path/dialog
   * concept in the browser, so the suggested name is echoed back as-is).
   * @param {Object} data
   * @param {string} suggestedName
   * @returns {Promise<string|null>} chosen path/name, or null if canceled
   */
  async saveRecipeAs(data, suggestedName = 'recipe.json') {
    if (this.isElectron) return window.electronAPI.saveRecipeAs(data, suggestedName)
    return this._downloadRecipe(data, suggestedName)
  }

  /**
   * Load a recipe. Under Electron this opens a native file-open dialog;
   * under the Web server mode it prompts the user to pick a local file via
   * the browser's file picker.
   * @returns {Promise<{fileName: string, data: Object}|null>} null if canceled
   */
  async openRecipe() {
    if (this.isElectron) return window.electronAPI.openRecipe()
    return this._pickRecipeFile()
  }

  /**
   * @private
   */
  async _fetchJson(url, options) {
    const res = await fetch(url, options)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed: ${res.status} ${url}`)
    }
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  /**
   * @private
   */
  _downloadRecipe(data, suggestedName) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    a.click()
    URL.revokeObjectURL(url)
    return suggestedName
  }

  /**
   * @private
   */
  _pickRecipeFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = async () => {
        const file = input.files && input.files[0]
        if (!file) {
          resolve(null)
          return
        }
        const text = await file.text()
        resolve({ fileName: file.name, data: JSON.parse(text) })
      }
      input.click()
    })
  }
}
