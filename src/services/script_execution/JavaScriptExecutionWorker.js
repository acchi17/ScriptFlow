// Global variable
//let scriptsDirPath = '';

/**
 * Send error message to main thread
 * 
 * Centralizes error reporting from the worker to the main thread.
 * Used by both explicit error handlers and global error handler.
 * 
 * @param {string} errorMessage Error message string
 */
function sendErrorToMain(errorMessage) { 
  self.postMessage({
    type: 'error',
    errmsg: errorMessage || 'No error message'
  });
}

/**
 * Initialization message handler
 * Currently unused - This handler is not being used in the current implementation.
 * 
 * @param {Object} data Message data containing configuration
 * @returns {Promise<void>}
 */
// async function handleInitMessage(data) {
//   try {
//     // Set script directory path
//     const { scriptsDir } = data;
//     if (scriptsDir) scriptsDirPath = scriptsDir;
    
//     // Send initialization complete message
//     self.postMessage({ type: 'initialized' });
//   } catch (error) {
//     throw new Error(`Worker initialization failed: ${error.message}`);
//   }
// }

/**
 * Script execution message handler
 * 
 * Dynamically imports the script file as an ES module and executes the exported execute function.
 * This approach supports import statements within script files.
 * This prevents blocking the main thread during execution.
 * 
 * @param {Object} data Message data containing execution parameters
 * @param {string} data.id Execution request ID
 * @param {string} data.scriptkName Name of the script file to execute
 * @param {Object} data.inputParams Input parameters for the script
 * @returns {Promise<void>}
 */
async function handleExecuteMessage(data) {
  const { id, scriptName, inputParams } = data;
  const type = 'result';
  console.log(`Worker executing script: ${scriptName} with`, inputParams);

  try {
    // Dynamically import the script module as an ES module
    // IMPORTANT: Must use template literals (`/path/${var}`) for dynamic imports with Webpack.
    // Storing the path in a variable first will cause module resolution errors.
    // The directory structure must remain static, only the filename should be dynamic.     
    //const scriptFilePath = `${scriptsDirPath}${scriptsDirPath.endsWith('/') ? '' : '/'}${scriptName}.js`;
    //const scriptModule = await import(scriptFilePath);
    const scriptModule = await import(/* @vite-ignore */`/scripts/${scriptName}.mjs`);

    // Verify that the module exports an execute function
    if (typeof scriptModule.execute !== 'function') {
      throw new Error(`Script "${scriptName}" does not export an execute function`);
    }
    
    // Call the execute function with input parameters
    // Using await to support both synchronous and asynchronous execute functions
    // If the execute function returns a Promise, it will be awaited; otherwise the value is returned directly
    const result = await scriptModule.execute(inputParams);
    // Send execution result back to main thread
    self.postMessage({
      type,
      id,
      result
    });
  } catch (error) {
    const errmsg = `Worker execution failed: ${error.message}`;
    console.log(errmsg);
    // Send error message back to main thread
    self.postMessage({
      type: 'error',
      id,
      errmsg
    });
  }
}

/**
 * Main thread message handler
 * 
 * Routes incoming messages to appropriate handler functions based on message type.
 * Provides centralized error handling for all message processing.
 */
self.onmessage = async function(e) {
  try {
    const { type } = e.data;
    
    // Delegate to appropriate handler based on message type
    switch (type) {
      // case 'init':
      //   await handleInitMessage(e.data);
      //   break;
      case 'execute':
        await handleExecuteMessage(e.data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    sendErrorToMain(error.message);
  }
};

/**
 * Global error handler
 * 
 * Execution timing:
 * - When an unhandled exception occurs in the self.onmessage handler
 * - When an error occurs in module processing during import
 * - When other unexpected Worker-level errors occur
 * 
 * This handler serves as a last resort to catch fatal Worker errors
 * that could not be handled by the try/catch within onmessage
 */
self.onerror = function(e) {
  sendErrorToMain(`Global worker error:${e.message}`);
};

/**
 * Notify that the Worker is ready to receive messages
 */
self.postMessage({ type: 'ready' });
