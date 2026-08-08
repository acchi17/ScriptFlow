import { FORMAT_VERSION } from './recipeFormat'

/**
 * RecipeSerializer
 * Builds a plain, JSON-serialisable recipe object from the live entry tree.
 * Stateless facade — all collaborators are injected.
 */
export default class RecipeSerializer {
  constructor(entryManager, entryParamManager, entryConnectionManager, socketManager) {
    this.entryManager = entryManager
    this.entryParamManager = entryParamManager
    this.entryConnectionManager = entryConnectionManager
    this.socketManager = socketManager
  }

  /**
   * @param {string} name - Recipe display name stored in meta.name
   * @returns {Object} recipe object
   */
  buildRecipe(name = '') {
    const root = this.entryManager.getRootEntry()
    if (!root) {
      throw new Error('RecipeSerializer.buildRecipe: no root entry exists')
    }

    return {
      formatVersion: FORMAT_VERSION,
      meta: {
        name,
        savedAt: new Date().toISOString()
      },
      root: this._serialiseEntry(root),
      connections: this.entryConnectionManager.toJson().connections
    }
  }

  /**
   * Serialise a single entry (and its descendants, if a container) to a plain node.
   * @param {Entry} entry
   * @returns {Object}
   * @private
   */
  _serialiseEntry(entry) {
    const node = { id: entry.id, type: entry.type, name: entry.name }

    if (entry.type === 'block') {
      node.inputParams = this.entryParamManager.getInputParams(entry.id)
    } else if (entry.type === 'container') {
      node.children = this.entryManager.getChildren(entry.id).map(child => this._serialiseEntry(child))
    }

    const comm = this.socketManager.getCommSetting(entry.id)
    if (comm) {
      node.comm = comm
    }

    return node
  }
}
