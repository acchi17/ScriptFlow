import { ref } from 'vue'
import { World } from '../ecs/core/World'

/**
 * EntryHierarchyHandler class
 * Handles parent-child tree structure between entries: attaching/detaching,
 * reordering, moving, descendant lookup, and DFS-based visual sequence numbers.
 */
export default class EntryHierarchyHandler {
  constructor(world = new World()) {
    // ECS world holding hierarchy components
    this._world = world;
    // Cache of entryId → 1-based sequence number (DFS visual order)
    this._sequenceNumbers = new Map();
    // ID of the root container for sequence number computation
    this._rootId = null;
    // Reactive counter incremented on every structural change (add/remove/reorder/move)
    this._hierarchyTick = ref(0);
  }

  /**
   * Check whether an entry is a block (i.e. its hierarchy component has no children array)
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a block
   */
  isBlock(entryId) {
    const hierarchy = this._world.hierarchies.get(entryId);
    return hierarchy !== undefined && hierarchy.children === null;
  }

  /**
   * Check whether an entry is a container (i.e. its hierarchy component has a children array)
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a container
   */
  isContainer(entryId) {
    const hierarchy = this._world.hierarchies.get(entryId);
    return hierarchy !== undefined && hierarchy.children !== null;
  }

  /**
  * Get the root entry's ID
  * @returns {string|null} Root entry ID or null
  */
  getRoot() {
    return this._rootId;
  }

  /**
   * Set the root container
   * Must be called once after the root container is registered.
   * @param {string} rootId
   */
  setRoot(rootId) {
    if (this._rootId == null) {
      console.log('Root entry set');
      this._rootId = rootId;
    }
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
    return hierarchy?.children ? [...hierarchy.children] : [];
  }

  /**
   * Get the list of IDs for an entry and all its descendants
   * @param {string} entryId - Target entry ID
   * @returns {Array<string>} List of IDs for the entry and all its descendants
   */
  getAllDescendants(entryId) {
    const ids = new Set([entryId]);

    if (!this.isContainer(entryId)) return Array.from(ids);

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
  get hierarchyTick() {
    return this._hierarchyTick;
  }

  /**
   * Initialize the hierarchy component for a freshly spawned entry.
   * @param {string} entryId - ID of the entry to initialize
   * @param {boolean} [noChildren=false] - If true, initialize children as null instead of an empty array
   */
  initialize(entryId, noChildren = false) {
    this._world.hierarchies.add(entryId, { parent: null, children: noChildren ? null : [] });
  }

  /**
   * Attach an entry into a parent's children array
   * @param {string} parentId - ID of the parent entry
   * @param {string} entryId - ID of the entry to attach
   * @param {number} index - Index position to add
   * @returns {boolean} Whether the attaching was successful
   */
  attachToParent(parentId, entryId, index) {
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

    this.rebuildSequenceNumbers();
    return true;
  }

  /**
   * Detach an entry from its parent
   * @param {string} entryId - ID of the entry to detach from its parent
   * @returns {boolean} Whether the detach operation was successful
   */
  detachFromParent(entryId) {
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
   * Reorder an entry within a parent entry
   * @param {string} parentId - ID of the parent entry
   * @param {string} entryId - ID of the entry to reorder
   * @param {number} index - Target index position
   * @returns {boolean} Whether the reordering was successful
   */
  reorderInParent(parentId, entryId, index) {
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
   * Truncate an entry's children
   * @param {string} entryId - ID of the entry whose children array should be cleared
   */
  clearChildren(entryId) {
    const hierarchy = this._world.hierarchies.get(entryId);
    if (hierarchy) {
      hierarchy.children.length = 0;
    }
    this.rebuildSequenceNumbers();
  }

  /**
   * Rebuild the sequence number map using DFS from the root.
   */
  rebuildSequenceNumbers() {
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
    this._hierarchyTick.value++;
  }
}
