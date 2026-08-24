/**
 * PlatformService
 *
 * Thin facade for file I/O that delegates to window.electronAPI (exposed via
 * preload). `isElectron` is kept as a property (rather than assumed true)
 * because the planned Web server execution mode will need a way to tell
 * whether it's running under Electron IPC or the future HTTP transport.
 */
export default class PlatformService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI
  }

  async readBlockDefinitions() {
    return window.electronAPI.readBlockDefinitions()
  }

  async writeBlockDefinitions(data) {
    return window.electronAPI.writeBlockDefinitions(data)
  }

  async listScripts() {
    return window.electronAPI.listScripts()
  }

  async saveScript(name, content) {
    return window.electronAPI.saveScript(name, content)
  }

  /**
   * Prompt the user for a save location and write the recipe there.
   * @param {Object} data
   * @param {string} suggestedName
   * @returns {Promise<string|null>} chosen path/name, or null if canceled
   */
  async saveRecipeAs(data, suggestedName = 'recipe.json') {
    return window.electronAPI.saveRecipeAs(data, suggestedName)
  }

  /**
   * Prompt the user to pick a recipe file and read it.
   * @returns {Promise<{fileName: string, data: Object}|null>} null if canceled
   */
  async openRecipe() {
    return window.electronAPI.openRecipe()
  }
}
