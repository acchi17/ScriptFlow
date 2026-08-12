import { World } from '../ecs/core/World'
import EntryHierarchyHandler from './EntryHierarchyHandler'

/**
 * EntryManager class
 * Class that manages parent-child relationships between entries
 */
export default class EntryManager {
  constructor(world = new World()) {
    // ECS world holding entry type components
    this._world = world;
    // Handles hierarchy structure (parent/children, root, sequence numbers)
    this.hierarchyHandler = new EntryHierarchyHandler(world, (entryId) => this.isContainer(entryId));
  }

  /**
   * Recursively remove all descendants of a entry
   * @param {string} entryId - ID of the entry whose descendants should be removed
   * @private
   */
  _removeDescendants(entryId) {
    // Process a copy since entries are removed from the store while iterating
    const childIds = [...(this._world.hierarchies.get(entryId)?.children ?? [])];
    for (const childId of childIds) {
      // If the child is a container, recursively process its descendants
      if (this.isContainer(childId)) {
        this._removeDescendants(childId);
      }

      // Remove from component stores
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
    return this._world.entryTypes.get(entryId)?.type === 'block';
  }

  /**
   * Check whether an entry is a container
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a container
   */
  isContainer(entryId) {
    return this._world.entryTypes.get(entryId)?.type === 'container';
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
   * @param {string|null} id - Unique ID of the entry (auto-generated if null)
   * @returns {string} ID of the created entry
   */
  addEntry(type, name, id = null) {
    const entryId = this._world.spawn(id);
    this._world.entryTypes.add(entryId, { name, type });
    this._world.hierarchies.add(entryId, { parent: null, children: [] });
    return entryId;
  }

  /**
   * Remove an entry from a parent entry
   * @param {string} entryId - ID of the entry to remove
   * @returns {boolean} Whether the removing was successful
   */
  removeEntry(entryId) {
    // Get parent entry
    const entryHierarchy = this._world.hierarchies.get(entryId);
    const parentId = entryHierarchy?.parent;
    if (!parentId) return false;

    // Get parent's children array (only containers have one)
    const parentHierarchy = this._world.hierarchies.get(parentId);
    if (!parentHierarchy) return false;

    // Remove from parent's children array
    const index = parentHierarchy.children.indexOf(entryId);
    if (index === -1) return false;

    parentHierarchy.children.splice(index, 1);

    // If the entry is a container, recursively remove all its descendants
    if (this.isContainer(entryId)) {
      this._removeDescendants(entryId);
    }

    // Remove the entry itself from the registry
    this._world.despawn(entryId);

    this.hierarchyHandler.rebuildSequenceNumbers();
    return true;
  }
}
