import { ref, readonly, shallowReactive } from 'vue';

/**
 * Execution Log Service
 * Manages execution history for entry executions (Block or Container)
 */
export default class ExecutionLogService {
  /**
   * Constructor
   * @param {EntryHandlerFacade} entryManager Entry management facade instance (optional)
   */
  constructor(entryManager = null) {
    this.entryManager = entryManager;
    // Hierarchical structure of execution logs
    this._executionsTree = ref({
      rootExecutions: [], // Top-level executions
      executionsByParent: {} // Dictionary of execution IDs and their parent IDs
    });
    // Flat, non-reactive dictionary of every execution record in the tree
    // (executionId -> shallowReactive execution). Used by updateLog() to find
    // a record without searching the tree.
    this._allExecutions = new Map();
    // Maximum number of logs to keep
    this._maxLogs = 1000;
    // Number of logs to remove in batch when cleanup is triggered
    this._cleanupBatchSize = 100;
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
   * Clear all execution logs
   * Removes all entries from the log history, clears the hierarchy structure
   * and the flat execution dictionary
   */
  clearLogs() {
    try {
      this._executionsTree.value = {
        rootExecutions: [],
        executionsByParent: {}
      };
      this._allExecutions.clear();
    } catch (error) {
      console.error(`[${this.constructor.name}] clearLogs() failed: ${error.message}`);
    }
  }

  /**
   * Get execution logs
   * @returns {Object} Readonly reactive reference to the execution tree
   */
  getLogs() {
    // Return the internal execution tree as a readonly reactive reference
    return readonly(this._executionsTree);
  }

  /**
   * Add a execution log and build hierarchy structure
   * @param {string} entryId ID of the entry being executed (Block or Container)
   * @param {Object} inputParams Input parameters of the entry at execution time (optional)
   * @param {string} executionId Execution ID (received from EntryExecutionService)
   * @param {string} parentExecutionId Parent entry's execution ID (optional)
   */
  addLog(entryId, inputParams, executionId, parentExecutionId = null) {
    try {
      // Create execution log.
      // The record is wrapped with shallowReactive() and the same proxy is stored
      // both in the tree and in _allExecutions, so that updateLog() changes are
      // seen by the view. updateLog() must only replace top-level fields
      // (result, execTime); if nested mutation is ever added, switch to reactive().
      const execution = shallowReactive({
        executionId: executionId,
        parentExecutionId: parentExecutionId,
        timestamp: new Date(),
        entryId: entryId,
        entryName: this.entryManager?.getEntryName(entryId),
        isContainer: this.entryManager?.isContainer(entryId),
        inputParams: inputParams,
        result: null,
        execTime: null,
        startTime: performance.now()
      });
      const tree = this._executionsTree.value;

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

      // Maintain maximum execution limit
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
