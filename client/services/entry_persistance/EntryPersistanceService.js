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
   * @param {string} entryId - ID of the entry to serialise
   * @returns {Object} recipe object
   */
  buildRecipe(entryId) {
    return this._serializer.buildRecipe(entryId)
  }

  /**
   * @param {Object} data - Parsed recipe object
   * @param {string} entryId - ID of the live entry to restore into
   * @returns {Promise<{ entryCount: number, connectionCount: number, warnings: string[] }>}
   */
  async restoreRecipe(data, entryId) {
    return this._deserializer.restoreRecipe(data, entryId)
  }

  /**
   * Build the recipe of the given entry and let the user pick where to save it.
   * @param {string} entryId - ID of the entry to save
   * @param {string} name - Suggested file name (without extension)
   * @returns {Promise<string|null>} chosen path/name, or null if canceled
   */
  async saveRecipe(entryId, name = '') {
    const data = this.buildRecipe(entryId)
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
