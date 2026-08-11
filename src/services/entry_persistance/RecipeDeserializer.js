import { FORMAT_VERSION } from './recipeFormat'

/**
 * RecipeDeserializer
 * Restores a parsed recipe object into the live managers, collecting
 * warnings for anything dropped or degraded instead of failing outright.
 * Stateless facade — all collaborators are injected.
 */
export default class RecipeDeserializer {
  constructor(entryManager, entryParamManager, entryConnectionManager,
    entryLayoutManager, socketManager, entryDefinitionService) {
    this.entryManager = entryManager
    this.entryParamManager = entryParamManager
    this.entryConnectionManager = entryConnectionManager
    this.entryLayoutManager = entryLayoutManager
    this.socketManager = socketManager
    this.entryDefinitionService = entryDefinitionService
  }

  /**
   * Validate/upgrade a parsed recipe object. Throws if the format is unsupported.
   * @param {Object} data
   * @returns {Object} the validated recipe object
   * @private
   */
  _migrate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('RecipeDeserializer: invalid recipe data')
    }
    if (data.formatVersion !== FORMAT_VERSION) {
      throw new Error(`RecipeDeserializer: unsupported recipe formatVersion "${data.formatVersion}"`)
    }
    return data
  }

  /**
   * Restore a recipe object into the live managers.
   * @param {Object} data - Parsed recipe object
   * @returns {Promise<{ entryCount: number, connectionCount: number, warnings: string[] }>}
   */
  async restoreRecipe(data) {
    const recipe = this._migrate(data)
    const warnings = []

    await this._clearRecipe()

    const rootId = this.entryManager.getRootEntryId()
    if (!rootId) {
      throw new Error('RecipeDeserializer.restoreRecipe: no live root entry to restore into')
    }

    const idMap = new Map([[recipe.root.id, rootId]])
    this.entryManager.setEntryName(rootId, recipe.root.name)

    const savedChildren = Array.isArray(recipe.root.children) ? recipe.root.children : []
    savedChildren.forEach((childNode, index) => {
      this._restoreEntries(childNode, rootId, index, idMap, warnings)
    })

    this._restoreConnections(recipe, idMap, warnings)
    await this._restoreComm(recipe.root, idMap)

    const entryCount = this.entryManager.getAllDescendantIds(rootId).length - 1
    const connectionCount = this.entryConnectionManager.getConnections().length

    return { entryCount, connectionCount, warnings }
  }

  /**
   * Remove the current tree (except the root itself), its params, layout and
   * connections, so a recipe can be restored into a clean state.
   * @private
   */
  async _clearRecipe() {
    const rootId = this.entryManager.getRootEntryId()
    if (!rootId) return

    this.entryConnectionManager.clearConnections()

    const descendantIds = this.entryManager.getAllDescendantIds(rootId)
      .filter(id => id !== rootId)
    descendantIds.forEach(id => {
      this.entryParamManager.removeParams(id)
      this.entryLayoutManager.deleteLayout(id)
    })

    const childIds = this.entryManager.getChildren(rootId)
    childIds.forEach(childId => this.entryManager.removeEntry(childId))

    await this.socketManager.release(rootId)
  }

  /**
   * Recursively recreate a saved node (and its descendants) under parentId.
   * Non-root ids are reused as-is; the id only differs for the root itself
   * (see idMap, keyed by the saved root id).
   * @param {Object} node - Saved entry node
   * @param {string} parentId - Live parent id to attach under
   * @param {number} index - Index within the parent's children
   * @param {Map<string,string>} idMap - saved id -> live id (root only; others fall through as-is)
   * @param {string[]} warnings
   * @private
   */
  _restoreEntries(node, parentId, index, idMap, warnings) {
    if (!node || (node.type !== 'block' && node.type !== 'container')) {
      warnings.push(`Skipped node with unknown type "${node?.type}" (id ${node?.id})`)
      return
    }

    if (node.type === 'container') {
      const containerId = this.entryManager.addEntry(parentId, node.type, node.name, index, node.id)
      idMap.set(node.id, containerId)

      const children = Array.isArray(node.children) ? node.children : []
      children.forEach((childNode, childIndex) => {
        this._restoreEntries(childNode, containerId, childIndex, idMap, warnings)
      })
      return
    }

    const blockId = this.entryManager.addEntry(parentId, node.type, node.name, index, node.id)
    idMap.set(node.id, blockId)

    const blockDef = this.entryDefinitionService.getBlockDefinition(node.name)
    if (!blockDef) {
      warnings.push(`Block definition "${node.name}" not found (entry ${blockId}) — kept with no params`)
      return
    }

    const paramDefs = this.entryDefinitionService.getBlockParamDef(node.name)
    this.entryParamManager.setInputParams(blockId, paramDefs.input)
    this.entryParamManager.setOutputParams(blockId, paramDefs.output)

    const savedInputParams = node.inputParams || {}
    Object.entries(savedInputParams).forEach(([paramName, value]) => {
      if (!(paramName in paramDefs.input)) {
        warnings.push(`Input param "${paramName}" no longer exists on block "${node.name}" (entry ${blockId}) — value ignored`)
        return
      }
      this.entryParamManager.setInputParam(blockId, paramName, value)
    })
  }

  /**
   * Remap saved connection endpoints through idMap, validate them semantically
   * (existence, param names, DFS order), collect warnings for anything dropped
   * or suspicious, then hand the survivors to EntryConnectionManager.
   * @param {Object} recipe
   * @param {Map<string,string>} idMap
   * @param {string[]} warnings
   * @private
   */
  _restoreConnections(recipe, idMap, warnings) {
    const savedConnections = Array.isArray(recipe.connections) ? recipe.connections : []
    const restored = []

    savedConnections.forEach((conn) => {
      const output = { ...conn.output, entryId: idMap.get(conn.output.entryId) ?? conn.output.entryId }
      const input = { ...conn.input, entryId: idMap.get(conn.input.entryId) ?? conn.input.entryId }

      if (!this.entryManager.getEntry(output.entryId) || !this.entryManager.getEntry(input.entryId)) {
        warnings.push(`Dropped connection: endpoint entry not found (${output.entryId} -> ${input.entryId})`)
        return
      }

      const outputParamNames = Object.keys(this.entryParamManager.getOutputParams(output.entryId))
      if (!outputParamNames.includes(output.paramName)) {
        warnings.push(`Dropped connection: output param "${output.paramName}" no longer exists on entry ${output.entryId}`)
        return
      }
      const inputParamNames = Object.keys(this.entryParamManager.getInputParams(input.entryId))
      if (!inputParamNames.includes(input.paramName)) {
        warnings.push(`Dropped connection: input param "${input.paramName}" no longer exists on entry ${input.entryId}`)
        return
      }

      const outputSeq = this.entryManager.getSequenceNumber(output.entryId)
      const inputSeq = this.entryManager.getSequenceNumber(input.entryId)
      if (outputSeq === null || inputSeq === null || outputSeq >= inputSeq) {
        warnings.push(`Dropped connection: output must precede input in execution order (${output.entryId} -> ${input.entryId})`)
        return
      }

      const currentOutputType = this.entryParamManager.getOutputParamType(output.entryId, output.paramName)
      const currentInputType = this.entryParamManager.getInputParamType(input.entryId, input.paramName)
      if (currentOutputType !== output.dataType || currentInputType !== input.dataType) {
        warnings.push(`Connection dataType differs from the current definition (${output.entryId}.${output.paramName} -> ${input.entryId}.${input.paramName}) — kept`)
      }

      restored.push({
        id: conn.id,
        output: { ...output, dataType: currentOutputType },
        input: { ...input, dataType: currentInputType }
      })
    })

    this.entryConnectionManager.restoreFromJson({ connections: restored })
  }

  /**
   * Recursively apply saved comm settings through idMap. A socket-connect
   * failure is not reported here — it surfaces via the existing commBtnStatus
   * UI state when the user next opens the Comm dialog.
   * @param {Object} node - Saved entry node (root or descendant)
   * @param {Map<string,string>} idMap
   * @private
   */
  async _restoreComm(node, idMap) {
    if (node.comm) {
      const liveId = idMap.get(node.id) ?? node.id
      const { useTcpIp, host, port } = node.comm
      this.socketManager.saveSetting(liveId, useTcpIp, host, port)
      if (useTcpIp) {
        await this.socketManager.create(liveId, host, port)
      }
    }

    const children = Array.isArray(node.children) ? node.children : []
    for (const child of children) {
      await this._restoreComm(child, idMap)
    }
  }
}
