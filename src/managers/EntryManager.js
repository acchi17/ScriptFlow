import { ref, reactive } from 'vue'
import Block from '../models/Block'
import Container from '../models/Container'

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
    // Dictionary of container IDs and their reactive children arrays
    this._childrenById = new Map();
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
    if (!root || !this.isContainer(root)) return;

    let counter = 0;
    const traverse = (children) => {
      for (const child of children) {
        this._sequenceNumbers.set(child.id, ++counter);
        if (this.isContainer(child)) {
          traverse(this._childrenById.get(child.id));
        }
      }
    };
    traverse(this._childrenById.get(root.id));
    this._updateTick.value++;
  }

  /**
   * Register an entry
   * @param {Entry} entry - Entry to register
   * @returns {boolean} Whether the registration was successful
   * @private
   */
  _registerEntry(entry) {
    if (!entry || !entry.id) return false;

    // Overwrite if already registered
    this._entriesById.set(entry.id, entry);

    // Containers get a reactive children array to hold their entries
    if (this.isContainer(entry) && !this._childrenById.has(entry.id)) {
      this._childrenById.set(entry.id, reactive([]));
    }

    return true;
  }

  /**
 * Attach an entry into a parent's children array
 * @param {string} parentId - ID of the parent entry
 * @param {Entry} entry - Entry to attach
 * @param {number} index - Index position to add
 * @returns {boolean} Whether the attaching was successful
 * @private
 */
  _attachEntry(parentId, entry, index) {
    // Get parent's children array (only containers have one)
    const parentChildren = this._childrenById.get(parentId);
    if (!parentChildren) return false;

    // Set parent-child relationship
    this._parentIdById.set(entry.id, parentId);

    // Add directly to parent's children array
    if (index >= 0 && index <= parentChildren.length) {
      parentChildren.splice(index, 0, entry);
      this._rebuildSequenceNumbers();
      return true;
    }
    return false;
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

    // Remove from parent's children array
    const parentChildren = this._childrenById.get(parentId);
    if (!parentChildren) return false;

    const index = parentChildren.findIndex(child => child.id === entryId);
    if (index === -1) return false;

    parentChildren.splice(index, 1);

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
    // Process a copy since entries are removed from the map while iterating
    const children = [...this._childrenById.get(entry.id)];
    for (const child of children) {
      // Remove parent-child relationship
      this._parentIdById.delete(child.id);

      // If the child is a container, recursively process its descendants
      if (this.isContainer(child)) {
        this._removeDescendants(child);
      }

      // Remove from entries map
      this._entriesById.delete(child.id);
    }

    // Drop the entry's own children entry
    this._childrenById.delete(entry.id);
  }

  /**
   * Check whether an entry is a container
   * @param {Entry} entry - Entry to check
   * @returns {boolean} Whether the entry is a container
   */
  isContainer(entry) {
    return entry?.type === 'container';
  }

  /**
   * Check whether an entry is a block
   * @param {Entry} entry - Entry to check
   * @returns {boolean} Whether the entry is a block
   */
  isBlock(entry) {
    return entry?.type === 'block';
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
   * Get the children of a container
   * @param {string} entryId - ID of the container
   * @returns {Array<Entry>} Children of the container, or an empty array if not a registered container
   */
  getChildren(entryId) {
    return this._childrenById.get(entryId) ?? [];
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
    if (!entry || !this.isContainer(entry)) return Array.from(ids);

    // Recursively get child entries
    for (const childEntry of this._childrenById.get(entryId)) {
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
    const entry = type === 'container' ? new Container(name, id) : new Block(name, id);
    this._registerEntry(entry);

    if (parentId === null) {
      this._setRoot(entry.id);
    } else {
      this._attachEntry(parentId, entry, index);
    }

    return entry.id;
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

    // Get parent's children array (only containers have one)
    const parentChildren = this._childrenById.get(parentId);
    if (!parentChildren) return false;

    // Get child entry
    const childEntry = this._entriesById.get(entryId);
    if (!childEntry) return false;

    // Remove from parent's children array
    const index = parentChildren.findIndex(child => child.id === entryId);
    if (index === -1) return false;

    parentChildren.splice(index, 1);

    // Delete parent-child relationship
    this._parentIdById.delete(entryId);

    // If the entry is a container, recursively remove all its descendants
    if (this.isContainer(childEntry)) {
      this._removeDescendants(childEntry);
    }

    // Remove the entry itself from the registry
    this._entriesById.delete(entryId);

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
    const parentChildren = this._childrenById.get(parentId);
    if (!parentChildren) return false;

    // Reorder within parent's children array
    const currentIndex = parentChildren.findIndex(child => child.id === entryId);
    if (currentIndex !== -1) {
      let targetIndex = index;
      if (index > currentIndex) {
        targetIndex = targetIndex - 1;
      }
      const child = parentChildren.splice(currentIndex, 1)[0];
      parentChildren.splice(targetIndex, 0, child);
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

    // Attach to the new parent
    if (newParentId === null) {
      this._setRoot(entry.id);
      return true;
    }
    return this._attachEntry(newParentId, entry, index);
  }

  /**
   * Find a container by ID
   * @param {string} containerId - ID of the container to find
   * @returns {Container|null} Found container or null
   * @unused This method is currently not used but kept for future extensibility
   */
  findContainerById(containerId) {
    const entry = this._entriesById.get(containerId);
    if (entry && this.isContainer(entry)) {
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
    if (!parentEntry || !this.isContainer(parentEntry)) return false;

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
