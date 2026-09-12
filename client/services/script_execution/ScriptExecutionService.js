/**
 * Script Execution Service
 * Forwards a script execution request to the host process (Electron IPC or
 * the Web server's HTTP API). Which interpreter actually runs the script is
 * decided by the host process from its own AppSettings.json, not here.
 */
export default class ScriptExecutionService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI
  }

  /**
   * Script execution result type definition
   * @typedef {Object} ScriptExecutionResult
   * @property {boolean} success Execution success flag (required)
   * In addition to the standard properties above, this object may include
   * arbitrary additional data returned by the executed script. The property names
   * and structure of additional data vary depending on the script implementation.
   */
  /**
   * Execute script
   * @param {string} scriptName Script file name
   * @param {Object} inputParams Input parameters (optional)
   * @return {Promise<ScriptExecutionResult>} Execution result object
   */
  async executeScript(scriptName = '', inputParams = {}) {
    try {
      if (this.isElectron) {
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
      console.log(`[${this.constructor.name}] executeScript() failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ask the host process to create and connect a socket.
   * @param {string} socketId
   * @param {string} host
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  async createSocket(socketId, host, port) {
    if (this.isElectron) {
      return await window.electronAPI.createSocket(socketId, host, port);
    }
    const response = await fetch('/api/sockets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socketId, host, port })
    });
    const { created } = await response.json();
    return created;
  }

  /**
   * Ask the host process to close a socket.
   * @param {string} socketId
   * @returns {Promise<boolean>}
   */
  async destroySocket(socketId) {
    if (this.isElectron) {
      return await window.electronAPI.destroySocket(socketId);
    }
    const response = await fetch(`/api/sockets/${encodeURIComponent(socketId)}`, { method: 'DELETE' });
    const { destroyed } = await response.json();
    return destroyed;
  }

  /**
   * Service termination process
   */
  terminate() {
  }
}
