import { ref } from 'vue'
import { World } from '../ecs/core/World'

/**
 * EntryManager class
 * Class that manages parent-child relationships between entries
 */
export default class EntryManager {
  constructor(world = new World()) {
    // ECS world holding entry type components
    this._world = world;
    // Cache of entryId → 1-based sequence number (DFS visual order)
    this._sequenceNumbers = new Map();
    // ID of the root container for sequence number computation
    this._rootId = null;
    // Reactive counter incremented on every structural change (add/remove/reorder/move)
    this._updateTick = ref(0);
  }

  /**
   * Set the root container for sequence number computation.
   * Must be called once after the root container is registered.
   * @param {string} rootId
   */
  _setRoot(rootId) {
    if (this._rootId == null) {
      console.log('Root entry set');
      this._rootId = rootId;
      this._rebuildSequenceNumbers();
    }
  }

  /**
   * Rebuild the sequence number map using DFS from the root.
   * @private
   */
  _rebuildSequenceNumbers() {
    this._sequenceNumbers.clear();
    if (!this._rootId) return;

    if (!this.isContainer(this._rootId)) return;

    let counter = 0;
    const traverse = (childIds) => {
      for (const childId of childIds) {
        this._sequenceNumbers.set(childId, ++counter);
        if (this.isContainer(childId)) {
          traverse(this._world.hierarchies.get(childId)?.children ?? []);
        }
      }
    };
    traverse(this._world.hierarchies.get(this._rootId)?.children ?? []);
    this._updateTick.value++;
  }

  /**
 * Attach an entry into a parent's children array
 * @param {string} parentId - ID of the parent entry
 * @param {string} entryId - ID of the entry to attach
 * @param {number} index - Index position to add
 * @returns {boolean} Whether the attaching was successful
 * @private
 */
  _attachEntry(parentId, entryId, index) {
    // Only containers may receive children
    if (!this.isContainer(parentId)) return false;

    const parentHierarchy = this._world.hierarchies.get(parentId);
    if (!parentHierarchy) return false;

    // Validate before mutating anything
    if (index < 0 || index > parentHierarchy.children.length) return false;

    // Add directly to parent's children array
    parentHierarchy.children.splice(index, 0, entryId);

    // Set parent-child relationship
    const entryHierarchy = this._world.hierarchies.get(entryId);
    if (entryHierarchy) {
      entryHierarchy.parent = parentId;
    }

    this._rebuildSequenceNumbers();
    return true;
  }

  /**
   * Detach an entry from its parent
   * @param {string} entryId - ID of the entry to detach from its parent
   * @returns {boolean} Whether the detach operation was successful
   * @private
   */
  _detachEntry(entryId) {
    // Validate entry id
    if (!entryId) return false;

    // Get parent entry
    const entryHierarchy = this._world.hierarchies.get(entryId);
    const parentId = entryHierarchy?.parent;
    if (!parentId) return true;

    // Remove from parent's children array
    const parentHierarchy = this._world.hierarchies.get(parentId);
    if (!parentHierarchy) return false;

    const index = parentHierarchy.children.indexOf(entryId);
    if (index === -1) return false;

    parentHierarchy.children.splice(index, 1);

    // Delete parent-child relationship
    entryHierarchy.parent = null;

    return true;
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
   * Get the children of a container
   * @param {string} entryId - ID of the container
   * @returns {Array<string>} Child entry IDs of the container, or an empty array if not a registered container
   */
  getChildren(entryId) {
    const hierarchy = this._world.hierarchies.get(entryId);
    return hierarchy ? [...hierarchy.children] : [];
  }

  /**
   * Get the root entry's ID
   * @returns {string|null} Root entry ID or null
   */
  getRootEntryId() {
    return this._rootId;
  }

  /**
   * Get the parent ID of an entry
   * @param {string} entryId - ID of the child entry
   * @returns {string|null} Parent entry ID or null
   */
  getParentId(entryId) {
    return this._world.hierarchies.get(entryId)?.parent ?? null;
  }

  /**
   * Get the list of IDs for an entry and all its descendants
   * @param {string} entryId - Target entry ID
   * @returns {Array<string>} List of IDs for the entry and all its descendants
   */
  getAllDescendantIds(entryId) {
    const ids = new Set([entryId]);

    if (!this.isContainer(entryId)) return Array.from(ids);

    // Recursively get child entries
    for (const childId of this._world.hierarchies.get(entryId)?.children ?? []) {
      const descendantIds = this.getAllDescendantIds(childId);
      descendantIds.forEach(id => ids.add(id));
    }

    return Array.from(ids);
  }

  /**
   * Get the sequence number (1-based visual position) of an entry.
   * @param {string} entryId
   * @returns {number|null} Sequence number or null if not found
   */
  getSequenceNumber(entryId) {
    return this._sequenceNumbers.get(entryId) ?? null;
  }

  /**
   * Reactive counter that increments on every structural change (add/remove/reorder/move).
   * Watch this to react to tree mutations without traversing the tree.
   * @returns {import('vue').Ref<number>}
   */
  get updateTick() {
    return this._updateTick;
  }

  /**
   * Create an entry and add it to a parent entry
   * If parentId is null, the entry is just registered as the root without a parent
   * @param {string|null} parentId - ID of the parent entry, or null to register as root
   * @param {string} type - Type of entry to create ('block' or 'container')
   * @param {string} name - Name of the entry
   * @param {number} index - Index position to add (ignored if parentId is null)
   * @param {string|null} id - Unique ID of the entry (auto-generated if null)
   * @returns {string} ID of the created entry
   */
  addEntry(parentId, type, name, index, id = null) {
    const entryId = this._world.spawn(id);
    this._world.entryTypes.add(entryId, { name, type });
    this._world.hierarchies.add(entryId, { parent: null, children: [] });

    if (parentId === null) {
      this._setRoot(entryId);
    } else {
      this._attachEntry(parentId, entryId, index);
    }

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

    this._rebuildSequenceNumbers();
    return true;
  }

  /**
   * Reorder an entry within a parent entry
   * @param {string} parentId - ID of the parent entry
   * @param {string} entryId - ID of the entry to reorder
   * @param {number} index - Target index position
   * @returns {boolean} Whether the reordering was successful
   */
  reorderEntry(parentId, entryId, index) {
    // Get parent's children array (only containers have one)
    const parentHierarchy = this._world.hierarchies.get(parentId);
    if (!parentHierarchy) return false;

    // Reorder within parent's children array
    const currentIndex = parentHierarchy.children.indexOf(entryId);
    if (currentIndex !== -1) {
      let targetIndex = index;
      if (index > currentIndex) {
        targetIndex = targetIndex - 1;
      }
      const childId = parentHierarchy.children.splice(currentIndex, 1)[0];
      parentHierarchy.children.splice(targetIndex, 0, childId);
      this._rebuildSequenceNumbers();
      return true;
    }
    return false;
  }

  /**
   * Move an entry to a different parent
   * @param {string} entryId - ID of the child entry to move
   * @param {string|null} newParentId - ID of the new parent entry (null to set as parentless)
   * @param {number} index - Target index position
   * @returns {boolean} Whether the moving was successful
   */
  moveEntry(entryId, newParentId, index) {
    // Check if the entry exists
    if (!this.isAlive(entryId)) return false;

    // Detach from the current parent
    this._detachEntry(entryId);

    // Attach to the new parent
    if (newParentId === null) {
      this._setRoot(entryId);
      return true;
    }
    return this._attachEntry(newParentId, entryId, index);
  }
}
