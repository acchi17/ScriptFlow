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

    // Detect Electron at construction time so we can skip Worker setup entirely
    // when the app exposes a native script-execution channel.
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI;

    // Worker management (browser build only)
    this.worker = null;
    this.pendingExecutions = new Map(); // {executionId: {resolve}}
    this.executionCounter = 0;
    this.workerDisabled = false;
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
   * Rejects all executions with an error
   * @param {string} errorMessage Error message to include in the rejection
   * @private
   */
  _rejectAllExecutions(errorMessage) {
    this.pendingExecutions.forEach((execution) => {
      const { reject } = execution;
      reject(new Error(`Critical error in Worker: ${errorMessage}`));
    });
    this.pendingExecutions.clear();
  }
  
  /**
   * Worker message handler
   * @param {MessageEvent} e Message event from Worker
   * @private
   */
  _handleWorkerMessage(e) {
    try {
      const { type, id, result, errmsg } = e.data;

      switch (type) {
        case 'ready': {
          this._log('Worker is ready');
          break;
        }
        // case 'initialized': {
        //   this._log('Worker has been initialized');
        //   break;
        // }
        case 'result': {
          const pendingExecution = this.pendingExecutions.get(id);
          if (pendingExecution) {
            const { resolve } = pendingExecution;
            resolve(result);
            this.pendingExecutions.delete(id);
          }
          break;
        }
        case 'error': {
          if (id !== undefined) {
            const pendingExecution = this.pendingExecutions.get(id);
            if (pendingExecution) {
              const { reject } = pendingExecution;
              reject(new Error(errmsg));
              this.pendingExecutions.delete(id);
            }
          } else {
            this._rejectAllExecutions(errmsg);
          }
          break;
        }
      }
    } catch(error) {
      this._rejectAllExecutions(error.message);
    }
  }

  /**
   * Worker error handler
   * @param {ErrorEvent} error Error event from Worker
   * @private
   */
  _handleWorkerError(error) {
    this._rejectAllExecutions(error.message);
    this.workerDisabled = true;
  }
  
  /**
   * JavaScript Worker initialization
   * @private
   */
  _initWorker() {
    try {
      // Create Module Worker dedicated to JavaScript engine
      this.worker = new Worker(new URL('./JavaScriptExecutionWorker.js', import.meta.url), { type: 'module' });
      
      // Set message handler
      this.worker.onmessage = this._handleWorkerMessage.bind(this);
      
      // Set error handler
      this.worker.onerror = this._handleWorkerError.bind(this);
      
      // Send Worker initialization message
      // const type = 'init';
      // const scriptsDir = this.scriptsDir;
      // this.worker.postMessage({ 
      //   type,
      //   scriptsDir
      // });
      
    } catch (error) {
      this._log('Failed to initialize Worker:', error);
      this.workerDisabled = true;
    }
  }

  /**
   * Execute script via Worker
   * @private
   */
  _executeViaWorker(scriptName, inputParams) {
    try {
      const executionId = ++this.executionCounter;
      
      return new Promise((resolve, reject) => {
        // Store execution info
        this.pendingExecutions.set(executionId, { resolve, reject });
        // Invoke Worker
        const type = 'execute';
        const id = executionId;
        this.worker.postMessage({
          type,
          id,
          scriptName,
          inputParams
        });
      });
    } catch (error) {
      this._log(`_executeViaWorker() failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Direct execution (fallback)
   * Dynamically imports the script file as an ES module and executes the exported execute function.
   * @private
   */
  async _executeDirectly(scriptName, inputParams) {
    try {
      // Dynamically import the script module as an ES module
      // IMPORTANT: Must use template literals (`/path/${var}`) for dynamic imports with Webpack.
      // Storing the path in a variable first will cause module resolution errors.
      // The directory structure must remain static, only the filename should be dynamic.
      //const scriptFilePath = `${this.scriptsDir}${this.scriptsDir.endsWith('/') ? '' : '/'}${scriptName}.js`;
      //const scriptModule = await import(scriptFilePath);
      const scriptModule = await import(/* @vite-ignore */`/scripts/${scriptName}.mjs`);

      // Verify that the module exports an execute function
      if (typeof scriptModule.execute !== 'function') {
        throw new Error(`Script "${scriptName}" does not export an execute function`);
      }
      
      // Call the execute function with input parameters
      // Using await to support both synchronous and asynchronous execute functions
      // If the execute function returns a Promise, it will be awaited; otherwise the value is returned directly
      return await scriptModule.execute(inputParams);
    } catch (error) {
      this._log(`_executeDirectly() failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialization process
   * @return {JavaScriptExecutionEngine} this after initialization
   */
  initialize() {
    // In Electron, script execution is delegated to a utility process via IPC.
    // No Worker needed in the renderer.
    if (!this.isElectron) {
      this._initWorker();
    }
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
        // Electron build: route to the main process, which forwards to the
        // utility-process script runner.
        return await window.electronAPI.executeScript(scriptName, inputParams);
      }
      else
      {
        if (!this.workerDisabled && this.worker) {
          // Execute via Worker if available
          return await this._executeViaWorker(scriptName, inputParams);
        } else {
          // Fallback: direct execution (includes file loading)
          return await this._executeDirectly(scriptName, inputParams);
        }
      }
    } catch (error) {
      this._log(`executeScript() failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Engine termination process
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingExecutions.clear();
  }
}
