import IScriptExecutionEngine from './IScriptExecutionEngine';

/**
 * JavaScript script execution engine
 */
export default class JavaScriptExecutionEngine extends IScriptExecutionEngine {
  /**
   * Constructor
   * @param {string} scriptsDir Script directory path
   * 
   * @example
   * const engine = new JavaScriptExecutionEngine('scripts');
   */
  constructor(scriptsDir = '') {
    super();
    this.scriptsDir = scriptsDir;

    // Kept as a property (rather than assumed true) because the planned Web
    // server execution mode will need a way to tell whether it's running
    // under Electron IPC or the future HTTP transport.
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI;
  }

  /**
   * Output log message
   * @param {string} message Log message
   * @private
   */
  _log(message) {
    console.log(`[${this.constructor.name}] ${message}`);
  }

  /**
   * Initialization process
   * @return {JavaScriptExecutionEngine} this after initialization
   */
  initialize() {
    return this;
  }

  /**
   * Execute JavaScript script
   * @param {string} scriptName Script file name
   * @param {Object} inputParams Input parameters
   * @return {Promise<Object>} Execution result
   */
  async executeScript(scriptName, inputParams = {}) {
    try {
      // Route to the main process, which forwards to the utility-process
      // script runner.
      return await window.electronAPI.executeScript(scriptName, inputParams);
    } catch (error) {
      this._log(`executeScript() failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Engine termination process
   */
  terminate() {
  }
}
