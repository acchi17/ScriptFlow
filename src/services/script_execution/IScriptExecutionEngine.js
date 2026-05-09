/**
 * Interface for Script Execution Engine
 * All engine implementation classes must conform to this interface
 */
export default class IScriptExecutionEngine {
  /**
   * Engine initialization (including Worker setup)
   * @return {IScriptExecutionEngine} this after initialization
   */
  initialize() {
    throw new Error("Method 'initialize' must be implemented");
  }
  
  /**
   * Execute script
   * @param {string} scriptName Script file name
   * @param {Object} inputParams Input parameters
   * @return {Promise<Object>} Execution result object
   */
  async executeScript() {
    throw new Error("Method 'executeScript' must be implemented");
  }
  
  /**
   * Engine termination process (including Worker termination)
   */
  terminate() {
    throw new Error("Method 'terminate' must be implemented");
  }
}
