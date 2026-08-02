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
  constructor(platformService, entryManager, entryParamManager,
    entryConnectionManager, entryLayoutManager, socketManager,
    entryDefinitionService) {
    this.platformService = platformService
    this._serializer = new RecipeSerializer(
      entryManager, entryParamManager, entryConnectionManager, socketManager
    )
    this._deserializer = new RecipeDeserializer(
      entryManager, entryParamManager, entryConnectionManager,
      entryLayoutManager, socketManager, entryDefinitionService
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
   * Build and persist the current recipe.
   * @param {string} fileName
   * @param {string} name - Recipe display name stored in meta.name
   */
  async saveRecipe(fileName = 'recipe.json', name = '') {
    const data = this.buildRecipe(name)
    await this.platformService.writeRecipe(fileName, data)
  }

  /**
   * Load and restore a recipe from storage.
   * @param {string} fileName
   * @returns {Promise<{ entryCount: number, connectionCount: number, warnings: string[] }>}
   */
  async loadRecipe(fileName = 'recipe.json') {
    const data = await this.platformService.readRecipe(fileName)
    return this.restoreRecipe(data)
  }
}
