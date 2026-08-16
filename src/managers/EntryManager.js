import { World } from '../ecs/core/World'
import EntryParamHandler from './EntryParamHandler'
import EntryConnectionHandler from './EntryConnectionHandler'
import EntryHierarchyHandler from './EntryHierarchyHandler'
import EntryLayoutHandler from './EntryLayoutHandler'
import { isContainerType, isBlockType } from '../ecs/queries/EntryTypeQueries'

/**
 * EntryManager class
 * Composition root for entry-related handlers. Owns entry identity (type/name/command)
 * and orchestrates the create/remove lifecycle across the hierarchy, param, and
 * connection handlers.
 */
export default class EntryManager {
  constructor(world = new World(), entryDefnitionStore = null) {
    // ECS world holding entry type components
    this._world = world;
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
    return isBlockType(this._world, entryId);
  }

  /**
   * Check whether an entry is a container
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a container
   */
  isContainer(entryId) {
    return isContainerType(this._world, entryId);
  }

  /**
   * Get the type of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry type ('block' or 'container'), or null if not found
   */
  getEntryType(entryId) {
    return this._world.entryTypes.get(entryId)?.type ?? null;
  }

  /**
   * Get the name of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|null} Entry name, or null if not found
   */
  getEntryName(entryId) {
    return this._world.entryTypes.get(entryId)?.name ?? null;
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
    const entryType = this._world.entryTypes.get(entryId);
    if (!entryType) return;
    entryType.name = name;
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
    this._world.entryTypes.add(entryId, { name, type });
    this.hierarchyHandler.initEntry(entryId);
    if (type === 'block') {
      const defaultParams = this.entryDefnitionStore?.getBlockParamDef(name) ?? { input: {}, output: {} };
      this.paramHandler.setInputParamDef(entryId, defaultParams.input);
      this.paramHandler.setOutputParamDef(entryId, defaultParams.output);
    } else if (type === 'container') {
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
   * Remove all entries except the root entry
   * @returns {boolean} Whether clearing was successful
   */
  clearEntries() {
    const rootId = this.hierarchyHandler.getRoot();
    if (!rootId) return false;

    this._removeDescendants(rootId);

    // Root itself isn't despawned, so its children array must be cleared explicitly.
    this.hierarchyHandler.clearChildrenOf(rootId);

    return true;
  }
}
