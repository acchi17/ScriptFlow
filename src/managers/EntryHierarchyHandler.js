import { ref } from 'vue'

/**
 * EntryHierarchyHandler class
 * Handles entry hierarchy structure (parent/children, root, sequence numbers)
 */
export default class EntryHierarchyHandler {
  /**
   * @param {import('../ecs/core/World').World} world - ECS world holding entry components
   * @param {(entryId: string) => boolean} isContainer - Predicate checking whether an entry id is a container (owned by EntryManager)
   */
  constructor(world, isContainer) {
    this._world = world;
    this._isContainer = isContainer;
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
      this.rebuildSequenceNumbers();
    }
  }

  /**
   * Rebuild the sequence number map using DFS from the root.
   */
  rebuildSequenceNumbers() {
    this._sequenceNumbers.clear();
    if (!this._rootId) return;

    if (!this._isContainer(this._rootId)) return;

    let counter = 0;
    const traverse = (childIds) => {
      for (const childId of childIds) {
        this._sequenceNumbers.set(childId, ++counter);
        if (this._isContainer(childId)) {
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
    if (!this._isContainer(parentId)) return false;

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

    this.rebuildSequenceNumbers();
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
   * Get the root entry's ID
   * @returns {string|null} Root entry ID or null
   */
  getRootEntry() {
    return this._rootId;
  }

  /**
   * Get the parent ID of an entry
   * @param {string} entryId - ID of the child entry
   * @returns {string|null} Parent entry ID or null
   */
  getParent(entryId) {
    return this._world.hierarchies.get(entryId)?.parent ?? null;
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
   * Get the list of IDs for an entry and all its descendants
   * @param {string} entryId - Target entry ID
   * @returns {Array<string>} List of IDs for the entry and all its descendants
   */
  getAllDescendants(entryId) {
    const ids = new Set([entryId]);

    if (!this._isContainer(entryId)) return Array.from(ids);

    // Recursively get child entries
    for (const childId of this._world.hierarchies.get(entryId)?.children ?? []) {
      const descendantIds = this.getAllDescendants(childId);
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
      this.rebuildSequenceNumbers();
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
    if (!this._world.isAlive(entryId)) return false;

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
