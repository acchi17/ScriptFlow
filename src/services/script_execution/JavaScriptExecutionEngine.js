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

    // Tells executeScript() whether to route through Electron IPC or the
    // Web server's HTTP API.
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
      if (this.isElectron) {
        // Route to the main process, which forwards to the utility-process
        // script runner.
        return await window.electronAPI.executeScript(scriptName, inputParams);
      }
      const response = await fetch(`/api/scripts/${encodeURIComponent(scriptName)}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputParams)
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Script execution failed: ${response.status}`);
      }
      return await response.json();
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
