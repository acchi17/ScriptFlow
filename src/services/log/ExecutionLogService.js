import { ref, readonly } from 'vue';

/**
 * Execution Log Service
 * Manages execution history for entry executions (Block or Container)
 */
export default class ExecutionLogService {
  /**
   * Constructor
   */
  constructor() {
    // Hierarchical structure of execution logs
    this._executionsTree = ref({
      rootExecutions: [], // Top-level executions
      executionsByParent: {} // Dictionary of execution IDs and their parent IDs
    });
    // Maximum number of logs to keep
    this._maxLogs = 1000;
    // Number of logs to remove in batch when cleanup is triggered
    this._cleanupBatchSize = 100;
  }

  /**
   * Get the current number of execution logs
   * @returns {number} The count of log executions
   * @private
   */
  _getExecutionCount() {
    let count = this._executionsTree.value.rootExecutions.length;
    for (const parentId in this._executionsTree.value.executionsByParent) {
      count += this._executionsTree.value.executionsByParent[parentId].length;
    }
    return count;
  }

  /**
   * Remove a execution log and all its descendants from hierarchy structure
   * @param {string} executionId Execution ID to remove
   * @private
   */
  _removeExecution(executionId) {
    // Get all child executions
    const children = this._executionsTree.value.executionsByParent[executionId] || [];
    // Recursively remove all descendants
    children.forEach(child => {
      this._removeExecution(child.executionId);
    });
    // Remove this execution's children from the dictionary
    delete this._executionsTree.value.executionsByParent[executionId];
  }

  /**
   * Find a execution log in the hierarchy structure
   * @param {string} executionId Execution ID to find
   * @returns {Object} Found execution entry or null
   * @private
   */
  _findExecution(executionId) {
    // Search in root executions
    const rootExecution = this._executionsTree.value.rootExecutions.find(e => e.executionId === executionId);
    if (rootExecution) {
      return rootExecution;
    }
    // Search in children executions
    for (const parentId in this._executionsTree.value.executionsByParent) {
      const children = this._executionsTree.value.executionsByParent[parentId];
      const childExecution = children.find(e => e.executionId === executionId);
      if (childExecution) {
        return childExecution;
      }
    }
    return null;
  }

  /**
   * Remove execution logs from hierarchy structure
   * @param {number|null} count Number of logs to remove, null to do nothing
   * @private
   */
  _cleanupExecutions(count) {
    if (count === null) {
      return;
    }
    const rootExecutions = this._executionsTree.value.rootExecutions;
    if (rootExecutions.length > 0 && count > 0) {
      // Calculate number of entries to remove (oldest entries are at the beginning)
      const numberOfLogsToRemove = Math.min(count, rootExecutions.length);
      // Remove oldest entries from the beginning of the array efficiently
      const removedExecutions = rootExecutions.splice(0, numberOfLogsToRemove);
      // Remove children entries and all descendants associated with removed parent entries
      removedExecutions.forEach(exec => {
        this._removeExecution(exec.executionId);
      });
    }
  }

  /**
   * Clear all execution logs
   * Removes all entries from the log history and clears the hierarchy structure
   */
  clearLogs() {
    try {
      this._executionsTree.value = {
        rootExecutions: [],
        executionsByParent: {}
      };
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
   * @param {Entry} entry Entry instance (Block or Container)
   * @param {string} executionId Execution ID (received from EntryExecutionService)
   * @param {string} parentExecutionId Parent entry's execution ID (optional)
   * @param {Object} inputParams Input parameters of the entry at execution time (optional)
   * @returns {string} Execution ID that can be used later to update the log
   */
  addLog(entry, inputParams, executionId, parentExecutionId = null) {
    try {
      // Create execution log
      const execution = {
        executionId: executionId,
        parentExecutionId: parentExecutionId,
        timestamp: new Date(),
        entryId: entry.id,
        entryName: entry.name,
        entryType: entry.type,
        inputParams: inputParams,
        result: null,
        execTime: null,
        startTime: performance.now()
      };

      // Build hierarchy structure immediately
      if (parentExecutionId) {
        // Add to parent's children
        if (!this._executionsTree.value.executionsByParent[parentExecutionId]) {
          this._executionsTree.value.executionsByParent[parentExecutionId] = [];
        }
        this._executionsTree.value.executionsByParent[parentExecutionId].push(execution);
      } else {
        // Add to root executions
        this._executionsTree.value.rootExecutions.push(execution);
      }

      // Maintain maximum execution limit
      const totalCount = this._getExecutionCount();
      if (totalCount > this._maxLogs) {
        // Remove batch size logs when exceeding maximum
        this._cleanupExecutions(this._cleanupBatchSize);
      }
    } catch (error) {
      console.error(`[${this.constructor.name}] addLog() failed: ${error.message}`);
    }
  }

  /**
   * Update a execution log
   * This method is called when an entry completes execution
   * It updates the log with the execution result
   * @param {string} executionId Execution ID
   * @param {Object} result Execution result
   */
  updateLog(executionId, result) {
    try {
      // Find and update the execution entry in hierarchy structure
      const execution = this._findExecution(executionId);
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
