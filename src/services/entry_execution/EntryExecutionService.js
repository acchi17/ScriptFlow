import ScriptExecutionService from '../script_execution/ScriptExecutionService';

/**
 * Entry Execution Service
 * Provides unified interface for executing entries (Block or Container)
 */
export default class EntryExecutionService {
  /**
   * Constructor
   * @param {Object} config Configuration object
   * @param {EntryParamManager} entryParamManager Entry parameter manager instance (optional)
   * @param {EntryConnectionManager} entryConnectionManager Entry connection manager instance (optional)
   * @param {ExecutionLogService} executionLogService Execution log service instance (optional)
   */
  constructor(config, entryParamManager = null, entryConnectionManager = null, executionLogService = null) {
    this.scriptExecutionService = new ScriptExecutionService(config.script);
    this.entryParamManager = entryParamManager;
    this.entryConnectionManager = entryConnectionManager;
    this.executionLogService = executionLogService;
    this._executionStack = []; // Stack to track currently executing entries
    
    // Centralized management of execution IDs
    this._sessionId = `session_${Date.now()}`;
    this._executionSequence = 0;
  }

  /**
   * Generate a new execution ID
   * @param {string} entryId The ID of the entry being executed
   * @returns {string} Generated execution ID
   * @private
   */
  _generateExecutionId(entryId) {
    this._executionSequence++;
    return `${this._sessionId}_${this._executionSequence}_${entryId}`;
  }

  /**
   * Build effective input params by overlaying connected upstream output values onto static params.
   * EntryParamManager is never mutated; the result is transient per execution call.
   * @param {string} entryId
   * @returns {Object} Effective input params { paramName: value }
   * @private
   */
  _resolveInputParams(entryId) {
    const base = this.entryParamManager ? this.entryParamManager.getInputParams(entryId) : {};
    if (!this.entryConnectionManager) return base;

    const result = { ...base };
    const connections = this.entryConnectionManager
      .getConnectionsByEntryId(entryId)
      .filter(conn => conn.input.entryId === entryId);
    for (const conn of connections) {
      const value = this.entryParamManager.getOutputParam(conn.output.entryId, conn.output.paramName);
      if (value !== undefined) {
        result[conn.input.paramName] = value;
      }
    }
    return result;
  }

  /**
   * Execute a block entry
   * @param {Block} block Block to execute
   * @param {Object} inputParams Input parameters for the block (optional)
   * @return {Promise<ScriptExecutionResult>}
   *         Execution result object conforming to ScriptExecutionResult type
   * @private
   */
  async _executeBlock(block, inputParams = {}) {
    let result = {};
    try {
      // Execute script based on block name
      result = await this.scriptExecutionService.executeScript(block.name, inputParams);
      // Store result values into output params
      if (this.entryParamManager) {
        const outputParamNames = Object.keys(this.entryParamManager.getOutputParams(block.id));
        for (const key of outputParamNames) {
          if (key in result) {
            this.entryParamManager.setOutputParam(block.id, key, result[key]);
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errorMessage = error.message;
    }
    if (result.success === undefined) {
      result.success = false;
    }
    return result;
  }

  /**
   * Execute a container entry
   * @param {Container} container Container to execute
   * @param {string} traceId Trace ID for execution tracking
   * @return {Promise<ScriptExecutionResult>}
   *         Execution result object conforming to ScriptExecutionResult type
   * @private
   */
  async _executeContainer(container, traceId) {
    let result = {};
    const childResults = [];
    try {
      // Execute child entries sequentially
      for (const childEntry of container.children) {
        const childResult = await this.executeEntry(childEntry, traceId);
        childResults.push(childResult);
      }
      result.success = childResults.every(childResult => childResult.success === true);
    } catch (error) {
      result.errorMessage = error.message;
    }
    if (result.success === undefined) {
      result.success = false;
    }
    return result;
  }

  /**
   * Check if any entry is currently executing
   * @return {boolean} True if an entry is executing, false otherwise
   */
  isExecuting() {
    return this._executionStack.length > 0;
  }

  /**
   * Execute an entry
   * @param {Entry} entry Entry to execute (Block or Container)
   * @param {string} traceId Trace ID for execution tracking (optional)
   * @return {Promise<*>} Execution result
   */
  async executeEntry(entry, traceId = null) {
    let result = {};
    try {
      // Push entry ID onto the stack when execution starts
      this._executionStack.push(entry.id);
      // Generate execution ID
      const executionId = this._generateExecutionId(entry.id);
      // Log execution start if execution log service is available
      const inputParams = this._resolveInputParams(entry.id);
      if (this.executionLogService) {
        this.executionLogService.addLog(entry, inputParams, executionId, traceId);
      }
      // Execute an entry
      if (entry.type === 'block') {
        result = await this._executeBlock(entry, inputParams);
      } else if (entry.type === 'container') {
        result = await this._executeContainer(entry, executionId);
      }
      // Log execution result if execution log service is available
      if (this.executionLogService) {
        this.executionLogService.updateLog(executionId, result);
      }
    } catch (error) {
      console.log(error.message);
    } finally {
      // Pop entry ID from stack when execution ends
      this._executionStack.pop();
    }
    return result;
  }

  /**
   * Terminate the service
   * Performs cleanup operations for ScriptExecutionService
   */
  terminate() {   
    if (this.scriptExecutionService) {
      this.scriptExecutionService.terminate();
    }
    this._executionStack = [];
  }
}
