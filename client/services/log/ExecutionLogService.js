import { reactive, readonly, shallowReactive } from 'vue';

/**
 * Execution Log Service
 * Manages execution history for entry executions (Block or Container).
 * Keeps one execution tree per root entry (one per tab), plus a `null`
 * fallback tree for records whose root cannot be resolved.
 */
export default class ExecutionLogService {
  /**
   * Constructor
   * @param {EntryHandlerFacade} entryManager Entry management facade instance (optional)
   */
  constructor(entryManager = null) {
    this.entryManager = entryManager;
    // Reactive map of execution trees: rootEntryId (or null) -> { rootExecutions, executionsByParent }.
    // A Map is used so that the null fallback key does not collide with a string key.
    this._trees = reactive(new Map());
    // Flat, non-reactive dictionary of every execution record in every tree
    // (executionId -> shallowReactive execution). Used by updateLog() to find
    // a record, and by addLog() to resolve a child record's root.
    this._allExecutions = new Map();
    // Readonly empty tree returned by getLogs() when there is no tree to show
    this._emptyTree = readonly({ rootExecutions: [], executionsByParent: {} });
    // Maximum number of logs to keep per tree
    this._maxLogs = 1000;
    // Number of logs to remove in batch when cleanup is triggered
    this._cleanupBatchSize = 100;
  }

  /**
   * Get the tree of a root entry, creating it on first use
   * @param {string|null} rootEntryId Root entry ID, or null for the fallback tree
   * @returns {Object} Reactive execution tree ({ rootExecutions, executionsByParent })
   * @private
   */
  _getOrCreateTree(rootEntryId) {
    if (!this._trees.has(rootEntryId)) {
      this._trees.set(rootEntryId, { rootExecutions: [], executionsByParent: {} });
    }
    return this._trees.get(rootEntryId);
  }

  /**
   * Remove every record of a tree from _allExecutions (the tree itself is untouched)
   * @param {Object} tree Execution tree ({ rootExecutions, executionsByParent })
   * @private
   */
  _forgetTreeRecords(tree) {
    tree.rootExecutions.forEach(exec => this._allExecutions.delete(exec.executionId));
    for (const parentId in tree.executionsByParent) {
      tree.executionsByParent[parentId].forEach(exec => this._allExecutions.delete(exec.executionId));
    }
  }

  /**
   * Get the current number of execution logs in a tree
   * @param {Object} tree Execution tree ({ rootExecutions, executionsByParent })
   * @returns {number} The count of log executions in the tree
   * @private
   */
  _getExecutionCount(tree) {
    let count = tree.rootExecutions.length;
    for (const parentId in tree.executionsByParent) {
      count += tree.executionsByParent[parentId].length;
    }
    return count;
  }

  /**
   * Remove an execution log and all its descendants from a tree
   * The execution and every descendant are also removed from _allExecutions.
   * The caller removes the execution itself from its parent list in the tree.
   * @param {Object} tree Execution tree ({ rootExecutions, executionsByParent })
   * @param {string} executionId Execution ID to remove
   * @private
   */
  _removeExecution(tree, executionId) {
    // Get all child executions
    const children = tree.executionsByParent[executionId] || [];
    // Recursively remove all descendants
    children.forEach(child => {
      this._removeExecution(tree, child.executionId);
    });
    // Remove this execution's children from the dictionary
    delete tree.executionsByParent[executionId];
    // Remove this execution from the flat dictionary
    this._allExecutions.delete(executionId);
  }

  /**
   * Remove the oldest top-level execution logs (and their descendants) from a tree
   * @param {Object} tree Execution tree ({ rootExecutions, executionsByParent })
   * @param {number|null} count Number of logs to remove, null to do nothing
   * @private
   */
  _cleanupExecutions(tree, count) {
    if (count === null) {
      return;
    }
    const rootExecutions = tree.rootExecutions;
    if (rootExecutions.length > 0 && count > 0) {
      // Calculate number of entries to remove (oldest entries are at the beginning)
      const numberOfLogsToRemove = Math.min(count, rootExecutions.length);
      // Remove oldest entries from the beginning of the array efficiently
      const removedExecutions = rootExecutions.splice(0, numberOfLogsToRemove);
      // Remove children entries and all descendants associated with removed parent entries
      removedExecutions.forEach(exec => {
        this._removeExecution(tree, exec.executionId);
      });
    }
  }


  /**
   * Clear the execution logs of one root entry
   * Empties that root's tree and removes its records from the flat execution
   * dictionary. Other trees are untouched. Does nothing when rootEntryId is
   * null/undefined (the hidden fallback tree is only trimmed by its cap) or
   * when the root has no tree yet (no tree is created).
   * @param {string} rootEntryId Root entry ID
   */
  clearLogs(rootEntryId) {
    try {
      if (rootEntryId === null || rootEntryId === undefined) {
        return;
      }
      const tree = this._trees.get(rootEntryId);
      if (!tree) {
        return;
      }
      this._forgetTreeRecords(tree);
      tree.rootExecutions = [];
      tree.executionsByParent = {};
    } catch (error) {
      console.error(`[${this.constructor.name}] clearLogs() failed: ${error.message}`);
    }
  }

  /**
   * Remove the execution tree of one root entry (e.g. when its tab is closed)
   * Removes its records from the flat execution dictionary and deletes the tree.
   * Does nothing for null/undefined or an unknown root.
   * @param {string} rootEntryId Root entry ID
   */
  removeLogs(rootEntryId) {
    try {
      if (rootEntryId === null || rootEntryId === undefined) {
        return;
      }
      const tree = this._trees.get(rootEntryId);
      if (!tree) {
        return;
      }
      this._forgetTreeRecords(tree);
      this._trees.delete(rootEntryId);
    } catch (error) {
      console.error(`[${this.constructor.name}] removeLogs() failed: ${error.message}`);
    }
  }

  /**
   * Get the execution logs of one root entry
   * The lookup goes through the reactive map, so a computed calling this
   * re-runs when that root's tree is created or removed.
   * @param {string} rootEntryId Root entry ID
   * @returns {Object} Readonly reactive execution tree ({ rootExecutions, executionsByParent }).
   *   An empty tree when rootEntryId is null/undefined or the root has no tree.
   */
  getLogs(rootEntryId) {
    if (rootEntryId === null || rootEntryId === undefined) {
      return this._emptyTree;
    }
    const tree = this._trees.get(rootEntryId);
    return tree ? readonly(tree) : this._emptyTree;
  }

  /**
   * Add a execution log to the tree of its root entry
   * The owning root is resolved here:
   * - child records (parentExecutionId set) go into the parent's tree;
   * - top-level records go into the tree of entryManager.getRootOf(entryId);
   * - records whose root cannot be resolved go into the null fallback tree.
   * @param {string} entryId ID of the entry being executed (Block or Container)
   * @param {Object} inputParams Input parameters of the entry at execution time (optional)
   * @param {string} executionId Execution ID (received from EntryExecutionService)
   * @param {string} parentExecutionId Parent entry's execution ID (optional)
   */
  addLog(entryId, inputParams, executionId, parentExecutionId = null) {
    try {
      // Resolve the owning root entry.
      // A parent missing from _allExecutions (removed by the cap, clearLogs() or
      // removeLogs()) gives null, so the record goes into the fallback tree.
      const rootEntryId = parentExecutionId
        ? (this._allExecutions.get(parentExecutionId)?.rootEntryId ?? null)
        : (this.entryManager?.getRootOf(entryId) ?? null);

      // Create execution log.
      // The record is wrapped with shallowReactive() and the same proxy is stored
      // both in the tree and in _allExecutions, so that updateLog() changes are
      // seen by the view. updateLog() must only replace top-level fields
      // (result, execTime); if nested mutation is ever added, switch to reactive().
      const execution = shallowReactive({
        executionId: executionId,
        parentExecutionId: parentExecutionId,
        rootEntryId: rootEntryId,
        timestamp: new Date(),
        entryId: entryId,
        entryName: this.entryManager?.getEntryName(entryId),
        isContainer: this.entryManager?.isContainer(entryId),
        inputParams: inputParams,
        result: null,
        execTime: null,
        startTime: performance.now()
      });
      const tree = this._getOrCreateTree(rootEntryId);

      // Build hierarchy structure immediately
      if (parentExecutionId) {
        // Add to parent's children
        if (!tree.executionsByParent[parentExecutionId]) {
          tree.executionsByParent[parentExecutionId] = [];
        }
        tree.executionsByParent[parentExecutionId].push(execution);
      } else {
        // Add to root executions
        tree.rootExecutions.push(execution);
      }
      // Register the same proxy in the flat dictionary
      this._allExecutions.set(executionId, execution);

      // Maintain maximum execution limit of this tree only
      const totalCount = this._getExecutionCount(tree);
      if (totalCount > this._maxLogs) {
        // Remove batch size logs when exceeding maximum
        this._cleanupExecutions(tree, this._cleanupBatchSize);
      }
    } catch (error) {
      console.error(`[${this.constructor.name}] addLog() failed: ${error.message}`);
    }
  }

  /**
   * Update a execution log
   * This method is called when an entry completes execution
   * It updates the log with the execution result.
   * Does nothing when the execution ID is unknown (e.g. removed by the cap or clearLogs()).
   * @param {string} executionId Execution ID
   * @param {Object} result Execution result
   */
  updateLog(executionId, result) {
    try {
      // Find the execution record through the flat dictionary; do nothing if missing
      const execution = this._allExecutions.get(executionId);
      if (execution) {
        const execTime = performance.now() - execution.startTime;
        execution.result = result;
        execution.execTime = execTime;
      }
    } catch (error) {
      console.error(`[${this.constructor.name}] updateLog() failed: ${error.message}`);
    }
  }
}
