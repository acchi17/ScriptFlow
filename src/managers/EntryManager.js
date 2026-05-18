import { ref } from 'vue'

/**
 * EntryManager class
 * Class that manages parent-child relationships between entries
 */
export default class EntryManager {
  constructor() {
    // Dictionary of entry IDs and objects
    this._entriesById = new Map();
    // Dictionary of child IDs and their parent IDs
    this._parentIdById = new Map();
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

    const root = this._entriesById.get(this._rootId);
    if (!root || root.type !== 'container') return;

    let counter = 0;
    const traverse = (children) => {
      for (const child of children) {
        this._sequenceNumbers.set(child.id, ++counter);
        if (child.type === 'container') {
          traverse(child.children);
        }
      }
    };
    traverse(root.children);
    this._updateTick.value++;
  }

  /**
   * Register an entry (Internal use)
   * @param {Entry} entry - Entry to register
   * @returns {boolean} Whether the registration was successful
   * @private
   */
  _registerEntry(entry) {
    if (!entry || !entry.id) return false;

    // Overwrite if already registered
    this._entriesById.set(entry.id, entry);
    return true;
  }

  /**
   * Detach an entry from its parent
   * @param {Entry} entry - Entry to detach from its parent
   * @returns {boolean} Whether the detach operation was successful
   * @private
   */
  _detachEntry(entry) {
    // Validate entry
    if (!entry || !entry.id) return false;

    const entryId = entry.id;

    // Get parent entry
    const parentId = this._parentIdById.get(entryId);
    if (!parentId) return true;

    const parentEntry = this._entriesById.get(parentId);
    if (!parentEntry || parentEntry.type !== 'container') return false;

    // Remove from parent's children array
    const index = parentEntry.children.findIndex(child => child.id === entryId);
    if (index === -1) return false;

    parentEntry.children.splice(index, 1);

    // Delete parent-child relationship
    this._parentIdById.delete(entryId);

    return true;
  }

  /**
   * Recursively remove all descendants of a entry
   * @param {Entry} entry - Entry whose descendants should be removed
   * @private
   */
  _removeDescendants(entry) {
    // Process all children of the container
    for (const child of entry.children) {
      // Remove parent-child relationship
      this._parentIdById.delete(child.id);

      // If the child is a container, recursively process its descendants
      if (child.type === 'container') {
        this._removeDescendants(child);
      }

      // Remove from entries map
      this._entriesById.delete(child.id);
    }

    // Clear the children array
    entry.children.length = 0;
  }

  /**
   * Get an entry
   * @param {string} entryId - ID of the entry to get
   * @returns {Entry|null} Retrieved entry or null
   */
  getEntry(entryId) {
    return this._entriesById.get(entryId) || null;
  }

  /**
   * Get the root entry
   * @returns {Entry|null} Root entry or null
   */
  getRootEntry() {
    if (!this._rootId) return null;
    return this._entriesById.get(this._rootId) || null;
  }

  /**
   * Get the parent of an entry
   * @param {string} entryId - ID of the child entry
   * @returns {Entry|null} Parent entry or null
   */
  getParentEntry(entryId) {
    const parentId = this._parentIdById.get(entryId);
    if (!parentId) return null;

    return this._entriesById.get(parentId) || null;
  }

  /**
   * Get the parent ID of an entry
   * @param {string} entryId - ID of the child entry
   * @returns {string|null} Parent entry ID or null
   */
  getParentId(entryId) {
    return this._parentIdById.get(entryId) || null;
  }

  /**
   * Get the list of IDs for an entry and all its descendants
   * @param {string} entryId - Target entry ID
   * @returns {Array<string>} List of IDs for the entry and all its descendants
   */
  getAllDescendantIds(entryId) {
    const ids = new Set([entryId]);

    const entry = this._entriesById.get(entryId);
    if (!entry || entry.type !== 'container') return Array.from(ids);

    // Recursively get child entries
    for (const childEntry of entry.children) {
      const childIds = this.getAllDescendantIds(childEntry.id);
      childIds.forEach(id => ids.add(id));
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
   * Add an entry to a parent entry
   * If parentId is null, the entry is just registered without a parent
   * @param {string|null} parentId - ID of the parent entry, or null to just register
   * @param {Entry} entry - Entry to add
   * @param {number} index - Index position to add (ignored if parentId is null)
   * @returns {boolean} Whether the addition was successful
   */
  addEntry(parentId, entry, index) {
    // If parentId is null, just register the entry without a parent
    if (parentId === null) {
      this._setRoot(entry.id);
      return this._registerEntry(entry);
    }

    // Get parent entry
    const parentEntry = this._entriesById.get(parentId);
    if (!parentEntry || parentEntry.type !== 'container') return false;

    // Register child entry
    this._registerEntry(entry);

    // Set parent-child relationship
    this._parentIdById.set(entry.id, parentId);

    // Add directly to parent's children array
    if (index >= 0 && index <= parentEntry.children.length) {
      parentEntry.children.splice(index, 0, entry);
      this._rebuildSequenceNumbers();
      return true;
    }
    return false;
  }

  /**
   * Remove an entry from a parent entry
   * @param {string} entryId - ID of the entry to remove
   * @returns {boolean} Whether the removing was successful
   */
  removeEntry(entryId) {
    // Get parent entry
    const parentId = this._parentIdById.get(entryId);
    if (!parentId) return false;

    const parentEntry = this._entriesById.get(parentId);
    if (!parentEntry || parentEntry.type !== 'container') return false;

    // Get child entry
    const childEntry = this._entriesById.get(entryId);
    if (!childEntry) return false;

    // Remove from parent's children array
    const index = parentEntry.children.findIndex(child => child.id === entryId);
    if (index === -1) return false;

    parentEntry.children.splice(index, 1);

    // Delete parent-child relationship
    this._parentIdById.delete(entryId);

    // If the entry is a container, recursively remove all its descendants
    if (childEntry.type === 'container') {
      this._removeDescendants(childEntry);
    }

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
    // Get parent entry
    const parentEntry = this._entriesById.get(parentId);
    if (!parentEntry || parentEntry.type !== 'container') return false;

    // Reorder within parent's children array
    const currentIndex = parentEntry.children.findIndex(child => child.id === entryId);
    if (currentIndex !== -1) {
      let targetIndex = index;
      if (index > currentIndex) {
        targetIndex = targetIndex - 1;
      }
      const child = parentEntry.children.splice(currentIndex, 1)[0];
      parentEntry.children.splice(targetIndex, 0, child);
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
    const entry = this._entriesById.get(entryId);
    if (!entry) return false;

    // Detach from the current parent
    this._detachEntry(entry);

    // Add to the new parent
    return this.addEntry(newParentId, entry, index);
  }

  /**
   * Find a container by ID
   * @param {string} containerId - ID of the container to find
   * @returns {Container|null} Found container or null
   * @unused This method is currently not used but kept for future extensibility
   */
  findContainerById(containerId) {
    const entry = this._entriesById.get(containerId);
    if (entry && entry.type === 'container') {
      return entry;
    }
    return null;
  }

  /**
   * Check if an entry has a parent
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry has a parent
   * @unused This method is currently not used but kept for future extensibility
   */
  hasParent(entryId) {
    return this._parentIdById.has(entryId);
  }

  /**
   * Check if an entry belongs to a specific parent
   * @param {string} entryId - ID of the child entry
   * @param {string} parentId - ID of the parent entry
   * @returns {boolean} Whether the child belongs to the parent
   * @unused This method is currently not used but kept for future extensibility
   */
  isChildOf(entryId, parentId) {
    return this._parentIdById.get(entryId) === parentId;
  }

  /**
   * Set parent-child relationship (overwrites existing relationship)
   * @param {string} childId - ID of the child entry
   * @param {string|null} parentId - ID of the parent entry (null to set as parentless)
   * @returns {boolean} Whether the setting was successful
   * @unused This method is currently not used but kept for future extensibility
   */
  setParentChildRelation(childId, parentId) {
    if (!childId) return false;

    if (parentId === null) {
      // Set as parentless
      this._parentIdById.delete(childId);
      return true;
    }

    // Check if parent entry exists
    const parentEntry = this._entriesById.get(parentId);
    if (!parentEntry || parentEntry.type !== 'container') return false;

    // Check if child entry exists
    const childEntry = this._entriesById.get(childId);
    if (!childEntry) return false;

    // Set parent-child relationship
    this._parentIdById.set(childId, parentId);
    return true;
  }

  /**
   * Remove parent-child relationship
   * @param {string} childId - ID of the child entry
   * @returns {boolean} Whether the removal was successful
   * @unused This method is currently not used but kept for future extensibility
   */
  removeParentChildRelation(childId) {
    if (!childId) return false;

    if (this._parentIdById.has(childId)) {
      this._parentIdById.delete(childId);
      return true;
    }

    return false;
  }
}
