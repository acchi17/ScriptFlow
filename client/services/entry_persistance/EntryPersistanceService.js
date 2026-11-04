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
    entryExecutionService,
    entryDefinitionService) {
    this.platformService = platformService
    this._serializer = new RecipeSerializer(
      entryManager
    )
    this._deserializer = new RecipeDeserializer(
      entryManager,
      entryExecutionService, entryDefinitionService
    )
  }

  /**
   * @param {string} rootId - ID of the root entry to serialise
   * @returns {Object} recipe object
   */
  buildRecipe(rootId) {
    return this._serializer.buildRecipe(rootId)
  }

  /**
   * @param {Object} data - Parsed recipe object
   * @param {string} rootId - ID of the live root entry to restore into
   * @returns {Promise<{ entryCount: number, connectionCount: number, warnings: string[] }>}
   */
  async restoreRecipe(data, rootId) {
    return this._deserializer.restoreRecipe(data, rootId)
  }

  /**
   * Build the recipe of the given root and let the user pick where to save it.
   * @param {string} rootId - ID of the root entry to save
   * @param {string} name - Suggested file name (without extension)
   * @returns {Promise<string|null>} chosen path/name, or null if canceled
   */
  async saveRecipe(rootId, name = '') {
    const data = this.buildRecipe(rootId)
    return this.platformService.saveRecipeAs(data, `${name || 'recipe'}.json`)
  }

  /**
   * Let the user pick a recipe file. Does not touch the entries; restoring the
   * picked data is up to the caller (see restoreRecipe()).
   * @returns {Promise<{ fileName: string, data: Object }|null>} null if canceled
   */
  async pickRecipe() {
    return this.platformService.openRecipe()
  }
}
