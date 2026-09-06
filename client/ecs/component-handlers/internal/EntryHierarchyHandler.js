import { ref } from 'vue'
import { World } from '../../core/World'

/**
 * EntryHierarchyHandler class
 * Handles parent-child tree structure between entries:
 * attaching/detaching/reordering, descendant lookup, 
 * and DFS-based visual sequence numbers.
 */
export default class EntryHierarchyHandler {
  constructor(world = new World()) {
    // Component store holding hierarchy (parent/children) data
    this._hierarchies = world.getStore('hierarchies');
    // Component store holding entryId → 1-based sequence number (DFS visual order)
    this._orders = world.getStore('orders');
    // Reactive counters incremented on every structural change (add/remove/reorder/move),
    // keyed by root entry id so watchers only react to changes within their own tree
    this._hierarchyTicks = new Map();
  }

  /**
   * Check whether an entry is a block (i.e. its hierarchy component has no children array)
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a block
   */
  isBlock(entryId) {
    const hierarchy = this._hierarchies.get(entryId);
    return hierarchy !== undefined && hierarchy.children === null;
  }

  /**
   * Check whether an entry is a container (i.e. its hierarchy component has a children array)
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a container
   */
  isContainer(entryId) {
    const hierarchy = this._hierarchies.get(entryId);
    return hierarchy !== undefined && hierarchy.children !== null;
  }

  /**
   * Check whether an entry is a registered root
   * @param {string} entryId - ID of the entry to check
   * @returns {boolean} Whether the entry is a registered root
   */
  isRoot(entryId) {
    return this._hierarchies.get(entryId)?.isRoot === true;
  }

  /**
  * Get the first registered root entry's ID
  * @returns {string|null} Root entry ID or null
  */
  getRoot() {
    for (const [id, hierarchy] of this._hierarchies.entries()) {
      if (hierarchy.isRoot) return id;
    }
    return null;
  }

  /**
   * Find the root entry that an entry belongs to by walking up its parent chain.
   * @param {string} entryId
   * @returns {string|null} The owning root entry's ID, or null if the top of the
   *   chain isn't a registered root (e.g. a freshly created entry not yet attached anywhere)
   */
  getRootOf(entryId) {
    let current = entryId;
    let parentId = this.getParent(current);
    while (parentId !== null) {
      current = parentId;
      parentId = this.getParent(current);
    }
    return this.isRoot(current) ? current : null;
  }

  /**
   * Register an entry as a root, creating its hierarchy tick if not already present
   * @param {string} rootId
   */
  addRoot(rootId) {
    const hierarchy = this._hierarchies.get(rootId);
    if (hierarchy) {
      hierarchy.isRoot = true;
      if (!this._hierarchyTicks.has(rootId)) {
        this._hierarchyTicks.set(rootId, ref(0));
      }
    }
  }

  /**
   * Get the parent ID of an entry
   * @param {string} entryId - ID of the child entry
   * @returns {string|null} Parent entry ID or null
   */
  getParent(entryId) {
    return this._hierarchies.get(entryId)?.parent ?? null;
  }

  /**
   * Get the children of a container
   * @param {string} entryId - ID of the container
   * @returns {Array<string>} Child entry IDs of the container, or an empty array if not a registered container
   */
  getChildren(entryId) {
    const hierarchy = this._hierarchies.get(entryId);
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
    for (const childId of this._hierarchies.get(entryId)?.children ?? []) {
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
    return this._orders.get(entryId)?.order ?? null;
  }

  /**
   * Get the reactive counter for one root's tree, incremented on every structural
   * change (add/remove/reorder/move) within it. Watch this to react to mutations
   * in a specific tree without traversing it, and without being notified about
   * unrelated roots' changes. Registered by addRoot(); undefined if rootId was
   * never registered as a root.
   * @param {string} rootId
   * @returns {import('vue').Ref<number>|undefined}
   */
  getHierarchyTick(rootId) {
    return this._hierarchyTicks.get(rootId);
  }

  /**
   * Initialize the hierarchy component for a freshly spawned entry.
   * @param {string} entryId - ID of the entry to initialize
   * @param {boolean} [noChildren=false] - If true, initialize children as null instead of an empty array
   */
  initialize(entryId, noChildren = false) {
    this._hierarchies.add(entryId, { parent: null, children: noChildren ? null : [], isRoot: false });
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

    const parentHierarchy = this._hierarchies.get(parentId);
    if (!parentHierarchy) return false;

    // Validate before mutating anything
    if (index < 0 || index > parentHierarchy.children.length) return false;

    // Add directly to parent's children array
    parentHierarchy.children.splice(index, 0, entryId);

    // Set parent-child relationship
    const entryHierarchy = this._hierarchies.get(entryId);
    if (entryHierarchy) {
      entryHierarchy.parent = parentId;
    }

    this.rebuildSequenceNumbers(this.getRootOf(parentId));
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
    const entryHierarchy = this._hierarchies.get(entryId);
    const parentId = entryHierarchy?.parent;
    if (!parentId) return true;

    // Remove from parent's children array
    const parentHierarchy = this._hierarchies.get(parentId);
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
    const parentHierarchy = this._hierarchies.get(parentId);
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
      this.rebuildSequenceNumbers(this.getRootOf(parentId));
      return true;
    }
    return false;
  }

  /**
   * Truncate an entry's children
   * @param {string} entryId - ID of the entry whose children array should be cleared
   */
  clearChildren(entryId) {
    const hierarchy = this._hierarchies.get(entryId);
    if (hierarchy) {
      hierarchy.children.length = 0;
    }
    this.rebuildSequenceNumbers(this.getRootOf(entryId));
  }

  /**
   * Rebuild the sequence number map for one root's tree using DFS, restarting
   * belonging to the same root, so other roots' numbers are left untouched.
   * Always bumps that root's hierarchy tick, even if rootId no longer resolves
   * to a live root (e.g. it was just removed) - the tick registered by addRoot()
   * outlives the root's despawn so watchers still get notified.
   * @param {string|null} rootId
   */
  rebuildSequenceNumbers(rootId) {
    const hierarchy = this._hierarchies.get(rootId);
    if (hierarchy?.isRoot && hierarchy.children !== null) {
      let counter = 0;
      const traverse = (childIds) => {
        for (const childId of childIds) {
          this._orders.add(childId, { order: ++counter });
          if (this.isContainer(childId)) {
            traverse(this._hierarchies.get(childId)?.children ?? []);
          }
        }
      };
      traverse(hierarchy.children);
    }
    const tick = this.getHierarchyTick(rootId);
    if (tick) tick.value++;
  }
}
