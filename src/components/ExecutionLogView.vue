<template>
  <div class="execution-log-view">
    <!-- Header section with title and clear button -->
    <div class="log-header">
      <h4>Execution Log</h4>
      <button @click="clearLogs" class="clear-button">Clear</button>
    </div>
    <!-- Empty state message -->
    <div v-if="transformedLogs.length === 0" class="empty-panel" />
    <!-- Log table with sandwich-style hierarchy display -->
    <div v-else class="log-panel">
      <table class="log-table">
        <thead>
          <tr class="table-header">
            <th class="col-start-time">Start Time</th>
            <th class="col-status">Status</th>
            <th class="col-name">Entry Name</th>
            <th class="col-input-params">Input</th>
            <th class="col-output-params">Output</th>
            <th class="col-error-msg">Error Message</th>
            <th class="col-exec-time">Exec. Time</th>
            <th class="col-id">ID</th>
          </tr>
        </thead>
        <tbody>
          <!-- Render processed log entries (sandwich-style) -->
          <template v-for="item in transformedLogs" :key="item.key">
            <!-- Regular entry row -->
            <tr v-if="item.type === 'entry'" :class="entryRowClass(item.data)">
              <td class="col-start-time">{{ formatTimestamp(item.data.timestamp) }}</td>
              <td class="col-status">
                <span v-if="item.data.result?.success !== undefined"
                  :class="item.data.result?.success ? 'status-success' : 'status-error'">
                  {{ item.data.result?.success ? 'Success' : 'Failed' }}
                </span>
              </td>             
              <td class="col-name">{{ item.data.entryName}}</td>
              <td class="col-input-params">{{ formatInputParams(item.data.inputParams) }}</td>
              <td class="col-output-params">{{ formatOutputParams(item.data.result) }}</td>
              <td class="col-error-msg">{{ item.data.result?.errorMessage }}</td>
              <td class="col-exec-time">{{ formatExecutionTime(item.data.execTime) }}ms</td>
              <td class="col-id">{{ item.data.entryId }}</td>
            </tr>

            <!-- Container group footer row -->
            <tr v-else-if="item.type === 'container-end'" class="container-group-footer">
              <td colspan="8"></td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useEntryExecution } from '../composables/useEntryExecution';

// Get functions from the composables
const { getLogs, clearLogs } = useEntryExecution();

/**
 * Get CSS classes for entry row based on entry type
 * Handles null/undefined result safely through optional chaining
 * @param {Object} entry The entry to get classes for
 * @returns {Object} Object with CSS class names as keys
 */
const entryRowClass = (entry) => {
  return {
    'entry-row': true,
    'block-row': entry?.entryType === 'block',
    'container-row': entry?.entryType === 'container'
  };
};

// Get logs from the service
const logs = getLogs();

/**
 * Format timestamp to YYYY/MM/DD hh:mm:ss.fff format
 * @param {Date} timestamp The timestamp to format
 * @returns {string} Formatted timestamp string
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Format execution time to display with 3 decimal places
 * @param {number} time The execution time in milliseconds
 * @returns {string} Formatted time string with 3 decimal places (without 'ms' unit)
 */
function formatExecutionTime(time) {
  if (time === undefined || time === null) return '';
  return time.toFixed(3);
}

/**
 * Format input parameters for display
 * @param {Object} inputParams Input parameters object
 * @returns {string} Formatted input parameters as key-value pairs
 */
function formatInputParams(inputParams) {
  if (!inputParams || Object.keys(inputParams).length === 0) return '';
  return Object.entries(inputParams).map(([key, value]) => `${key}: ${value}`).join(', ');
}

/**
 * Format result into output parameters for display
 * Displays properties other than success, errorMessage
 * @param {Object} result Execution result object
 * @returns {string} Formatted output parameters as key-value pairs
 */
function formatOutputParams(result) {
  if (!result) return '';
  
  const excludedKeys = ['success', 'errorMessage'];
  const entries = Object.entries(result).filter(([key]) => !excludedKeys.includes(key));
  // When entries is empty, join() returns an empty string
  return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
}

/**
 * Recursively add child executions to the result array
 * Helper function to handle nested container executions
 * @param {string} parentId The parent execution ID
 * @param {Object} executionsTree The execution tree structure
 * @param {Array} result the array to add child executions to
 */
function addChildExecutions(parentId, executionsTree, result) {
  const children = executionsTree.executionsByParent[parentId] || [];
  
  children.forEach(childExecution => {
    // Add the child execution entry
    result.push({
      type: 'entry',
      key: `entry_${childExecution.executionId}`,
      data: childExecution
    });
    
    // If the child execution is a container, add its children recursively
    if (childExecution.entryType === 'container') {
      // Recursive call to handle nested containers
      addChildExecutions(childExecution.executionId, executionsTree, result);
      
      // Container end marker
      result.push({
        type: 'container-end',
        key: `end_${childExecution.executionId}`,
        containerName: childExecution.entryName
      });
    }
  });
}

/**
 * Transform hierarchical execution tree into a flat array with special
 * marker entries to indicate container relationships (sandwich-style display)
 * @returns {Array} Flat array of entries with container grouping markers
 */
const transformedLogs = computed(() => {
  const result = [];
  try {
    const executionsTree = logs.value;
    
    // Process root executions in reverse order (newest first)
    for (let i = executionsTree.rootExecutions.length - 1; i >= 0; i--) {
      const execution = executionsTree.rootExecutions[i];
      const isRootContainer = execution.entryName === 'root-container';

      if (!isRootContainer) {
        result.push({
          type: 'entry',
          key: `entry_${execution.executionId}`,
          data: execution
        });
      }

      // If the execution is a container, add container grouping markers
      if (execution.entryType === 'container') {
        // Recursively add child executions
        addChildExecutions(execution.executionId, executionsTree, result);

        if (!isRootContainer) {
          // Container end marker
          result.push({
            type: 'container-end',
            key: `end_${execution.executionId}`,
            containerName: execution.entryName
          });
        }
      }
    }
  } catch (error) {
    console.error(`transformedLogs() failed: ${error.message}`);
  }
  return result;
});
</script>

<style scoped>
/* Main container for the execution log view */
.execution-log-view {
  width: 600px;
  display: flex;
  flex-direction: column;
}

/* Header section with title and clear button */
.log-header {
  height: 36px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
  color: #333;
}

.clear-button {
  padding: 4px 12px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
}

.clear-button:hover {
  background-color: #e8e8e8;
  border-color: #999;
}

.clear-button:active {
  background-color: #ddd;
}

/* Panel for the empty message */
.empty-panel {
  flex: 1;
}

/* Panel for the log table */
.log-panel {
  flex: 1;
  overflow: auto;
}

/* Log table styling */
.log-table {
  border-collapse: collapse;
  font-size: 12px;
}

/* Table header styling */
.table-header {
  background-color: #f5f5f5;
  border-bottom: 2px solid #ddd;
  color: #333;
  position: sticky;
  /* Required to activate the position: sticky effect.
     Sticky positioning only works when one of top, right, bottom, or left is specified */
  top: 0;
  z-index: 100;
}

.table-header th {
  padding: 8px 8px;
  text-align: left;
  font-weight: 600;
  border-right: 1px solid #e0e0e0;
}

.table-header th:last-child {
  border-right: none;
}

/* Column width styling */
.col-start-time {
  min-width: 160px;
}

.col-status {
  min-width: 60px;
}

.col-name {
  min-width: 160px;
}

.col-input-params {
  min-width: 160px;
}

.col-output-params {
  min-width: 160px;
}

.col-error-msg {
  min-width: 160px;
}

.col-exec-time {
  min-width: 100px;
}

.col-id {
  min-width: 300px;
}

/* Entry row styling */
.entry-row {
  transition: background-color 0.2s ease;
}

.entry-row:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.entry-row td {
  padding: 8px;
  vertical-align: middle;
  color: #333;
}

/* Block-specific row styling */
.block-row {
  background-color: var(--block-bg-color);
  border-bottom: 1px solid #e8e8e8;
}

.block-row:hover {
  background-color: var(--block-hover-bg-color);
}

.block-row td {
  border-right: 1px solid #e8e8e8;
}

.block-row td:last-child {
  border-right: none;
}

/* Container-specific row styling */
.container-row {
  background-color: var(--container-bg-color);
}

.container-row:hover {
  background-color: var(--container-hover-bg-color);
}

.container-row td {
  border-right: none;
}

/* Container group footer row */
.container-group-footer {
  background-color: var(--container-bg-color);
  border-bottom: 1px solid var(--container-hover-bg-color);
}

.container-group-footer td {
  padding: 3px;
}

/* Status badge styling */
.status-success {
  color: #2d7d2d;
  font-weight: 500;
}

.status-error {
  color: #c41e1e;
  font-weight: 500;
}
</style>
