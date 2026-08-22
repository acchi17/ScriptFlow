import RecipeSerializer from './RecipeSerializer'
import RecipeDeserializer from './RecipeDeserializer'

/**
 * EntryPersistanceService
 * Facade for saving/restoring a recipe (entry tree, parameter values,
 * connections, per-entry comm settings) as recipe.json. Delegates
 * serialisation to RecipeSerializer/RecipeDeserializer and I/O to
 * PlatformService.
 */
export default class EntryPersistanceService {
  constructor(platformService, entryManager,
    socketManager,
    entryDefinitionService) {
    this.platformService = platformService
    this._serializer = new RecipeSerializer(
      entryManager, socketManager
    )
    this._deserializer = new RecipeDeserializer(
      entryManager,
      socketManager, entryDefinitionService
    )
  }

  /**
   * @param {string} name - Recipe display name stored in meta.name
   * @returns {Object} recipe object
   */
  buildRecipe(name = '') {
    return this._serializer.buildRecipe(name)
  }

  /**
   * @param {Object} data - Parsed recipe object
   * @returns {Promise<{ entryCount: number, connectionCount: number, warnings: string[] }>}
   */
  async restoreRecipe(data) {
    return this._deserializer.restoreRecipe(data)
  }

  /**
   * Build the current recipe and let the user pick where to save it.
   * @param {string} name - Recipe display name stored in meta.name
   * @returns {Promise<string|null>} chosen path/name, or null if canceled
   */
  async saveRecipe(name = '') {
    const data = this.buildRecipe(name)
    return this.platformService.saveRecipeAs(data, `${name || 'recipe'}.json`)
  }

  /**
   * Let the user pick a recipe file and restore it.
   * @returns {Promise<{ entryCount: number, connectionCount: number, warnings: string[] }|null>} null if canceled
   */
  async loadRecipe() {
    const picked = await this.platformService.openRecipe()
    if (!picked) return null
    return this.restoreRecipe(picked.data)
  }
}
