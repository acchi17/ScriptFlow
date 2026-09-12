import { FORMAT_VERSION } from './recipeFormat'

/**
 * RecipeSerializer
 * Builds a plain, JSON-serialisable recipe object from the live entry tree.
 * Stateless facade — all collaborators are injected.
 */
export default class RecipeSerializer {
  constructor(entryManager, entryExecutionService) {
    this.entryManager = entryManager
    this.entryExecutionService = entryExecutionService
  }

  /**
   * @returns {Object} recipe object
   */
  buildRecipe() {
    const rootId = this.entryManager.getRoot()
    if (!rootId) {
      throw new Error('RecipeSerializer.buildRecipe: no root entry exists')
    }

    return {
      formatVersion: FORMAT_VERSION,
      meta: {
        savedAt: new Date().toISOString()
      },
      root: this._serialiseEntry(rootId),
      connections: this.entryManager.getConnections()
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

    const comm = this.entryExecutionService.getCommSetting(entryId)
    if (comm) {
      node.comm = comm
    }

    return node
  }
}
