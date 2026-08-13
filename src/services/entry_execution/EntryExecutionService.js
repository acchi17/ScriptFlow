import ScriptExecutionService from '../script_execution/ScriptExecutionService';
import ContainerExecutionFactory from './ContainerExecutionFactory';

/**
 * Entry Execution Service
 * Provides unified interface for executing entries (Block or Container)
 */
export default class EntryExecutionService {
  /**
   * Constructor
   * @param {Object} config Configuration object
   * @param {EntryManager} entryManager Entry manager instance (optional)
   * @param {EntryConnectionManager} entryConnectionManager Entry connection manager instance (optional)
   * @param {ExecutionLogService} executionLogService Execution log service instance (optional)
   */
  constructor(config, entryManager = null, entryConnectionManager = null, executionLogService = null) {
    this.scriptExecutionService = new ScriptExecutionService(config.script);
    this.entryManager = entryManager;
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
   * EntryParamHandler is never mutated; the result is transient per execution call.
   * @param {string} entryId
   * @returns {Object} Effective input params { paramName: value }
   * @private
   */
  _resolveInputParams(entryId) {
    const base = this.entryManager ? this.entryManager.paramHandler.getInputParams(entryId) : {};
    if (!this.entryConnectionManager) return base;

    const result = { ...base };
    const connections = this.entryConnectionManager
      .getConnectionsByEntryId(entryId)
      .filter(conn => conn.input.entryId === entryId);
    for (const conn of connections) {
      const value = this.entryManager.paramHandler.getOutputParam(conn.output.entryId, conn.output.paramName);
      if (value !== undefined) {
        result[conn.input.paramName] = value;
      }
    }
    return result;
  }

  /**
   * Execute a block entry
   * @param {string} entryId ID of the block entry to execute
   * @param {Object} inputParams Input parameters for the block (optional)
   * @return {Promise<ScriptExecutionResult>}
   *         Execution result object conforming to ScriptExecutionResult type
   * @private
   */
  async _executeBlock(entryId, inputParams = {}) {
    let result = {};
    try {
      // Execute script based on the block definition's command
      const command = this.entryManager.getEntryCommand(entryId);
      if (command === undefined) {
        const entryName = this.entryManager.getEntryName(entryId);
        throw new Error(`No command found for block "${entryName}"`);
      }
      result = await this.scriptExecutionService.executeScript(command, inputParams);
      // Store result values into output params
      if (this.entryManager) {
        const outputParamNames = Object.keys(this.entryManager.paramHandler.getOutputParams(entryId));
        for (const key of outputParamNames) {
          if (key in result) {
            this.entryManager.paramHandler.setOutputParam(entryId, key, result[key]);
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
   * @param {string} entryId ID of the container entry to execute
   * @param {string} traceId Trace ID for execution tracking
   * @return {Promise<ScriptExecutionResult>}
   *         Execution result object conforming to ScriptExecutionResult type
   * @private
   */
  async _executeContainer(entryId, traceId) {
    let result = {};
    try {
      const entryName = this.entryManager.getEntryName(entryId);
      const strategy = ContainerExecutionFactory.createStrategy(entryName, this.entryManager);
      result = await strategy.execute(entryId, childId => this.executeEntry(childId, traceId));
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
   * @param {string} entryId ID of the entry to execute (Block or Container)
   * @param {string} traceId Trace ID for execution tracking (optional)
   * @return {Promise<*>} Execution result
   */
  async executeEntry(entryId, traceId = null) {
    let result = {};
    try {
      // Push entry ID onto the stack when execution starts
      this._executionStack.push(entryId);
      // Generate execution ID
      const executionId = this._generateExecutionId(entryId);
      // Log execution start if execution log service is available
      const inputParams = this._resolveInputParams(entryId);
      if (this.executionLogService) {
        this.executionLogService.addLog(entryId, inputParams, executionId, traceId);
      }
      // Execute an entry
      if (this.entryManager.isBlock(entryId)) {
        result = await this._executeBlock(entryId, inputParams);
      } else if (this.entryManager.isContainer(entryId)) {
        result = await this._executeContainer(entryId, executionId);
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
