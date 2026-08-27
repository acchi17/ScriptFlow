import { ref } from 'vue'
import { World } from '../ecs/core/World'
import EntryParamHandler from './EntryParamHandler'
import EntryConnectionHandler from './EntryConnectionHandler'
import EntryHierarchyHandler from './EntryHierarchyHandler'

/**
 * EntryManager class
 * Composition root for entry-related handlers. Owns entry identity (type/name/command)
 * and orchestrates the create/remove lifecycle across the hierarchy, param, and
 * connection handlers.
 */
export default class EntryManager {
  constructor(world = new World(), entryDefnitionStore = null) {
    // ECS world holding entry components
    this._world = world;
    // Component store holding entry info (name/label/comment) data
    this._entryInfos = world.getStore('entryInfos');
    // Provides block definitions (parameters, command) for entries
    this.entryDefnitionStore = entryDefnitionStore;
    // Handles parent-child tree structure between entries
    this.hierarchyHandler = new EntryHierarchyHandler(world);
    // Handles parameter values and types of entries
    this.paramHandler = new EntryParamHandler(world);
    // Handles connection states between entry output/input parameters
    this.connectionHandler = new EntryConnectionHandler(world);
    // Component store holding measured layout (position/height) of entries
    this._layouts = world.getStore('layouts');
    // Reactive counter incremented on every layout change (set/clear).
    // ComponentStore wraps a plain Map, so Vue can't auto-track reads through it -
    // consumers must read this tick inside a computed() before calling a getter below.
    this._layoutsTick = ref(0);
  }

  // #region Private
  /**
   * Recursively remove all descendants of a entry
   * @param {string} entryId - ID of the entry whose descendants should be removed
   * @private
   */
  _removeDescendants(entryId) {
    const childIds = this.hierarchyHandler.getChildren(entryId);
    for (const childId of childIds) {
      // If the child is a container, recursively process its descendants
      if (this.isContainer(childId)) {
        this._removeDescendants(childId);
      }

      this.connectionHandler.removeConnectionsByEntryId(childId);
      this.paramHandler.removeParamDef(childId);
      this._world.despawn(childId);
    }
  }
  // #endregion

  // #region Entry info related
  /**
   * Get the name of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry name, or null if not found
   */
  getEntryName(entryId) {
    return this._entryInfos.get(entryId)?.name ?? null;
  }

  /**
   * Set the name of an entry
   * @param {string} entryId - ID of the entry
   * @param {string} name - New name for the entry
   */
  setEntryName(entryId, name) {
    const entryInfo = this._entryInfos.get(entryId);
    if (!entryInfo) return;
    entryInfo.name = name;
  }

  /**
   * Get the label of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry label, or null if not found
   */
  getEntryLabel(entryId) {
    return this._entryInfos.get(entryId)?.label ?? null;
  }

  /**
   * Set the label of an entry
   * @param {string} entryId - ID of the entry
   * @param {string} label - New label for the entry
   */
  setEntryLabel(entryId, label) {
    const entryInfo = this._entryInfos.get(entryId);
    if (!entryInfo) return;
    entryInfo.label = label;
  }

  /**
   * Get the comment of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry comment, or null if not found
   */
  getEntryComment(entryId) {
    return this._entryInfos.get(entryId)?.comment ?? null;
  }

  /**
   * Set the comment of an entry
   * @param {string} entryId - ID of the entry
   * @param {string} comment - New comment for the entry
   */
  setEntryComment(entryId, comment) {
    const entryInfo = this._entryInfos.get(entryId);
    if (!entryInfo) return;
    entryInfo.comment = comment;
  }

  /**
   * Get the command of an entry's block definition
   * @param {string} entryId - ID of the entry
   * @returns {string|undefined} Command string, or undefined
   */
  getEntryCommand(entryId) {
    const entryName = this.getEntryName(entryId);
    return this.entryDefnitionStore?.getBlockDefinition(entryName)?.command;
  }
  // #endregion
  
  // #region Entry layout related
  /**
   * Reactive counter that increments whenever a layout is set or cleared.
   * Watch/read this to react to layout changes without deep reactivity.
   * @returns {import('vue').Ref<number>}
   */
  get layoutsTick() {
    return this._layoutsTick;
  }

  /**
   * Record the measured Y position and height of an entry's header element.
   * @param {string} entryId
   * @param {number} y
   * @param {number} height
   */
  addLayout(entryId, y, height) {
    this._layouts.add(entryId, { y, height });
    this._layoutsTick.value++;
  }

  /**
   * Get the measured layout of an entry.
   * @param {string} entryId
   * @returns {{ y: number, height: number } | undefined}
   */
  getLayout(entryId) {
    return this._layouts.get(entryId);
  }

  /**
   * Get all recorded layouts.
   * @returns {Array<[string, { y: number, height: number }]>}
   */
  getAllLayouts() {
    return Array.from(this._layouts.entries());
  }

  /**
   * Clear all recorded layouts.
   */
  clearLayouts() {
    this._layouts.clear();
    this._layoutsTick.value++;
  }
  // #endregion

  // #region Entry hierarchy related
  /**
   * Reactive counter that increments on every structural change (add/remove/reorder/move).
   * Watch this to react to tree mutations without traversing the tree.
   * @returns {import('vue').Ref<number>}
   */
  get hierarchyTick() {
    return this.hierarchyHandler.hierarchyTick;
  }

  /**
   * Check whether an entry id is a live entity in the ECS world
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry id is alive
   */
  isAlive(entryId) {
    return this._world.isAlive(entryId);
  }

  /**
   * Check whether an entry is a block
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a block
   */
  isBlock(entryId) {
    return this.hierarchyHandler.isBlock(entryId);
  }

  /**
   * Check whether an entry is a container
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a container
   */
  isContainer(entryId) {
    return this.hierarchyHandler.isContainer(entryId);
  }

  /**
   * Get the root entry's ID
   * @returns {string|null} Root entry ID or null
   */
  getRoot() {
    return this.hierarchyHandler.getRoot();
  }

  /**
   * Get the parent ID of an entry
   * @param {string} entryId - ID of the child entry
   * @returns {string|null} Parent entry ID or null
   */
  getParent(entryId) {
    return this.hierarchyHandler.getParent(entryId);
  }

  /**
   * Get the children of a container
   * @param {string} entryId - ID of the container
   * @returns {Array<string>} Child entry IDs of the container, or an empty array if not a registered container
   */
  getChildren(entryId) {
    return this.hierarchyHandler.getChildren(entryId);
  }

  /**
   * Get the list of IDs for an entry and all its descendants
   * @param {string} entryId - Target entry ID
   * @returns {Array<string>} List of IDs for the entry and all its descendants
   */
  getAllDescendants(entryId) {
    return this.hierarchyHandler.getAllDescendants(entryId);
  }

  /**
   * Create an entry, registering it in the ECS world
   * @param {string} type - Type of entry to create ('block' or 'container')
   * @param {string} name - Name of the entry
   * @param {string|null} preferredId - Optional id of the entry (auto-generated if null)
   * @returns {string} ID of the created entry
   */
  addEntry(type, name, preferredId = null) {
    const entryId = this._world.spawn(preferredId);
    this._entryInfos.add(entryId, { name, label: '', comment: '' });
    if (type === 'block') {
      this.hierarchyHandler.initialize(entryId, true);
      const defaultParams = this.entryDefnitionStore?.getBlockParamDef(name) ?? { input: {}, output: {} };
      this.paramHandler.setInputParamDef(entryId, defaultParams.input);
      this.paramHandler.setOutputParamDef(entryId, defaultParams.output);
    } else if (type === 'container') {
      this.hierarchyHandler.initialize(entryId, false);
      const defaultParams = this.entryDefnitionStore?.getContainerParamDef(name) ?? { input: {}, output: {} };
      this.paramHandler.setInputParamDef(entryId, defaultParams.input);
      this.paramHandler.setOutputParamDef(entryId, defaultParams.output);
    }
    return entryId;
  }

  /**
   * Remove an entry from a parent entry
   * @param {string} entryId - ID of the entry to remove
   * @returns {boolean} Whether the removing was successful
   */
  removeEntry(entryId) {
    // A parentless entry (e.g. the root) must never be removed
    const parentId = this.hierarchyHandler.getParent(entryId);
    if (!parentId) return false;

    if (!this.hierarchyHandler.detachFromParent(entryId)) return false;

    // If the entry is a container, recursively remove all its descendants
    if (this.isContainer(entryId)) {
      this._removeDescendants(entryId);
    }

    this.connectionHandler.removeConnectionsByEntryId(entryId);
    this.paramHandler.removeParamDef(entryId);
    this._world.despawn(entryId);

    this.hierarchyHandler.rebuildSequenceNumbers();
    return true;
  }

  /**
   * Move an entry to a different parent
   * @param {string} entryId - ID of the child entry to move
   * @param {string|null} newParentId - ID of the new parent entry (null to set as parentless)
   * @param {number} index - Target index position
   * @returns {boolean} Whether the moving was successful
   */
  moveEntry(entryId, newParentId, index) {
    if (!this.isAlive(entryId)) return false;

    this.hierarchyHandler.detachFromParent(entryId);

    if (newParentId === null) {
      this.hierarchyHandler.setRoot(entryId);
      return true;
    }
    return this.hierarchyHandler.attachToParent(newParentId, entryId, index);
  }

  /**
   * Reorder an entry within its parent entry
   * @param {string} parentId - ID of the parent entry
   * @param {string} entryId - ID of the entry to reorder
   * @param {number} index - Target index position
   * @returns {boolean} Whether the reordering was successful
   */
  reorderInParent(parentId, entryId, index) {
    return this.hierarchyHandler.reorderInParent(parentId, entryId, index);
  }

  /**
   * Remove all entries except the root entry
   * @returns {boolean} Whether clearing was successful
   */
  clearEntries() {
    const rootId = this.hierarchyHandler.getRoot();
    if (!rootId) return false;

    this._removeDescendants(rootId);

    // Root itself isn't despawned, so its children array must be cleared explicitly.
    this.hierarchyHandler.clearChildren(rootId);

    return true;
  }
  // #endregion

  // #region Entry parameter related
  /**
   * Reactive counter that increments whenever output parameters change.
   * Watch/read this to react to output param updates without deep-reactive storage.
   * @returns {import('vue').Ref<number>}
   */
  get outputParamsTick() {
    return this.paramHandler.outputParamsTick;
  }

  /**
   * Check if an entry has one or more input or output parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one input or output parameter
   */
  hasParam(entryId) {
    return this.paramHandler.hasInputParam(entryId) || this.paramHandler.hasOutputParam(entryId);
  }

  /**
   * Check if an entry has one or more input parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one input parameter
   */
  hasInputParam(entryId) {
    return this.paramHandler.hasInputParam(entryId);
  }

  /**
   * Check if an entry has one or more output parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one output parameter
   */
  hasOutputParam(entryId) {
    return this.paramHandler.hasOutputParam(entryId);
  }

  /**
   * Get a specific input parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {{value: any, dataType: string}|undefined} Parameter value and type, or undefined
   */
  getInputParam(entryId, paramName) {
    return this.paramHandler.getInputParam(entryId, paramName);
  }

  /**
   * Set a single input parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the input parameter
   * @param {any} value - New value
   */
  setInputParam(entryId, paramName, value) {
    this.paramHandler.setInputParam(entryId, paramName, value);
  }

  /**
   * Get a specific output parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {{value: any, dataType: string}|undefined} Parameter value and type, or undefined
   */
  getOutputParam(entryId, paramName) {
    return this.paramHandler.getOutputParam(entryId, paramName);
  }

  /**
   * Set a single output parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the output parameter
   * @param {any} value - New value
   */
  setOutputParam(entryId, paramName, value) {
    this.paramHandler.setOutputParam(entryId, paramName, value);
  }

  /**
   * Get input parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object} Input parameters object in the form { name: value }
   */
  getInputParamValues(entryId) {
    const params = this.paramHandler.getInputParams(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
  }

  /**
   * Get output parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object} Output parameters object in the form { name: value }
   */
  getOutputParamValues(entryId) {
    const params = this.paramHandler.getOutputParams(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
  }

  /**
   * Get input parameter data types
   * @param {string} entryId - ID of the entry
   * @returns {Object} Input parameter types in the form { name: type }
   */
  getInputParamTypes(entryId) {
    const params = this.paramHandler.getInputParams(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.dataType]));
  }

  /**
   * Get output parameter data types
   * @param {string} entryId - ID of the entry
   * @returns {Object} Output parameter types in the form { name: type }
   */
  getOutputParamTypes(entryId) {
    const params = this.paramHandler.getOutputParams(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.dataType]));
  }
  // #endregion

  // #region Entry connection related
  /**
   * Reactive counter that increments whenever the set of connections changes.
   * Watch/read this to react to connection changes without deep reactivity.
   * @returns {import('vue').Ref<number>}
   */
  get connectionsTick() {
    return this.connectionHandler.connectionsTick;
  }

  /**
   * Get all connections as an array.
   * @returns {Array<Object>}
   */
  getConnections() {
    return this.connectionHandler.getConnections();
  }

  /**
   * Get all connections that involve the given entry id
   * (either as output or input).
   * @param {string} entryId
   * @returns {Array<Object>}
   */
  getConnectionsByEntryId(entryId) {
    return this.connectionHandler.getConnectionsByEntryId(entryId);
  }

  /**
   * Get all connections for a specific parameter endpoint.
   * @param {string} entryId
   * @param {'input'|'output'} category
   * @param {string} paramName
   * @returns {Array<Object>}
   */
  getConnectionsByEndpoint(entryId, category, paramName) {
    return this.connectionHandler.getConnectionsByEndpoint(entryId, category, paramName);
  }

  /**
   * Add a new connection between an output and an input endpoint.
   * @param {Object} output - Output endpoint { entryId, category, dataType, paramName }
   * @param {Object} input  - Input endpoint { entryId, category, dataType, paramName }
   * @param {string|null} preferredId - Optional id to spawn the connection under (e.g. when restoring)
   * @returns {string|null} The new connection id, or null if validation fails
   */
  addConnection(output, input, preferredId = null) {
    return this.connectionHandler.addConnection(output, input, preferredId);
  }

  /**
   * Remove a connection by its id.
   * @param {string} connectionId
   * @returns {boolean} true if the connection was found and removed
   */
  removeConnection(connectionId) {
    return this.connectionHandler.removeConnection(connectionId);
  }
  // #endregion
}
