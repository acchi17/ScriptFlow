import JavaScriptExecutionEngine from './JavaScriptExecutionEngine';
// import PythonExecutionEngine from './PythonExecutionEngine';  // Future implementation

/**
 * Script Execution Factory
 */
export default class ScriptExecutionFactory {
  /**
   * Creates a script execution engine for the specified language
   * 
   * @param {string} engineName Engine name (e.g., 'javascript')
   * @param {string} scriptsDir Script directory path (optional)
   * @return {IScriptExecutionEngine} Initialized engine instance
   * 
   * @throws {Error} If unsupported engine name is specified
   * 
   * @example
   * const engine = ScriptExecutionFactory.createEngine('javascript', 'scripts');
   * const result = await engine.executeScript('myScript', { param1: 'value' });
   */
  static createEngine(engineName = 'javascript', scriptsDir = '') {
    switch (engineName.toLowerCase()) {
      case "javascript":
        return new JavaScriptExecutionEngine(scriptsDir).initialize();
      
      // case "python":
      //   return new PythonExecutionEngine(scriptsDir).initialize();
      
      default:
        throw new Error(`Unsupported script engine name: ${engineName}`);
    }
  }
}
