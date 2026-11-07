import { FORMAT_VERSION } from './recipeFormat'

/**
 * RecipeSerializer
 * Builds a plain, JSON-serialisable recipe object from the live entry tree.
 * Stateless facade — all collaborators are injected.
 */
export default class RecipeSerializer {
  constructor(entryManager) {
    this.entryManager = entryManager
  }

  /**
   * @param {string} entryId - ID of the entry to serialise
   * @returns {Object} recipe object
   * @throws {Error} If entryId is not a registered root
   */
  buildRecipe(entryId) {
    if (!this.entryManager.isRoot(entryId)) {
      throw new Error(`RecipeSerializer.buildRecipe: "${entryId}" is not a root entry`)
    }

    return {
      formatVersion: FORMAT_VERSION,
      meta: {
        savedAt: new Date().toISOString()
      },
      root: this._serialiseEntry(entryId),
      connections: this.entryManager.getConnections(entryId)
    }
  }

  /**
   * Serialise a single entry (and its descendants, if a container) to a plain node.
   * @param {string} entryId
   * @returns {Object}
   * @private
   */
  _serialiseEntry(entryId) {
    const isBlock = this.entryManager.isBlock(entryId)
    const isContainer = this.entryManager.isContainer(entryId)
    const node = {
      id: entryId,
      type: isBlock ? 'block' : (isContainer ? 'container' : null),
      name: this.entryManager.getEntryName(entryId),
      label: this.entryManager.getEntryLabel(entryId),
      comment: this.entryManager.getEntryComment(entryId)
    }

    if (isBlock) {
      node.inputParams = this.entryManager.getInputParamValues(entryId)
    } else if (isContainer) {
      node.inputParams = this.entryManager.getInputParamValues(entryId)
      node.children = this.entryManager.getChildren(entryId)
        .map(childId => this._serialiseEntry(childId))
    }

    const comm = this.entryManager.getComm(entryId)
    if (comm) {
      node.comm = comm
    }

    return node
  }
}
