import { World } from '../ecs/core/World'
import EntryParamHandler from './EntryParamHandler'
import EntryConnectionHandler from './EntryConnectionHandler'
import EntryHierarchyHandler from './EntryHierarchyHandler'
import EntryLayoutHandler from './EntryLayoutHandler'

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
    // Handles parameter values and types of entries
    this.paramHandler = new EntryParamHandler(world);
    // Handles connection states between entry output/input parameters
    this.connectionHandler = new EntryConnectionHandler(world);
    // Handles parent-child tree structure between entries
    this.hierarchyHandler = new EntryHierarchyHandler(world);
    // Handles measured layout (position/height) of entries
    this.layoutHandler = new EntryLayoutHandler(world);
  }

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
   * Get the name of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry name, or null if not found
   */
  getEntryName(entryId) {
    return this._entryInfos.get(entryId)?.name ?? null;
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
   * Get the comment of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry comment, or null if not found
   */
  getEntryComment(entryId) {
    return this._entryInfos.get(entryId)?.comment ?? null;
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
}
