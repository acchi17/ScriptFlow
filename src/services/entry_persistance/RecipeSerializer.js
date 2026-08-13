import { FORMAT_VERSION } from './recipeFormat'

/**
 * RecipeSerializer
 * Builds a plain, JSON-serialisable recipe object from the live entry tree.
 * Stateless facade — all collaborators are injected.
 */
export default class RecipeSerializer {
  constructor(entryManager, socketManager) {
    this.entryManager = entryManager
    this.socketManager = socketManager
  }

  /**
   * @param {string} name - Recipe display name stored in meta.name
   * @returns {Object} recipe object
   */
  buildRecipe(name = '') {
    const rootId = this.entryManager.hierarchyHandler.getRootEntry()
    if (!rootId) {
      throw new Error('RecipeSerializer.buildRecipe: no root entry exists')
    }

    return {
      formatVersion: FORMAT_VERSION,
      meta: {
        name,
        savedAt: new Date().toISOString()
      },
      root: this._serialiseEntry(rootId),
      connections: this.entryManager.connectionHandler.getConnections()
    }
  }

  /**
   * Serialise a single entry (and its descendants, if a container) to a plain node.
   * @param {string} entryId
   * @returns {Object}
   * @private
   */
  _serialiseEntry(entryId) {
    const node = {
      id: entryId,
      type: this.entryManager.getEntryType(entryId),
      name: this.entryManager.getEntryName(entryId)
    }

    if (this.entryManager.isBlock(entryId)) {
      node.inputParams = this.entryManager.paramHandler.getInputParams(entryId)
    } else if (this.entryManager.isContainer(entryId)) {
      node.children = this.entryManager.hierarchyHandler.getChildren(entryId)
        .map(childId => this._serialiseEntry(childId))
    }

    const comm = this.socketManager.getCommSetting(entryId)
    if (comm) {
      node.comm = comm
    }

    return node
  }
}
