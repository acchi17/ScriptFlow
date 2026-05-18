import { reactive } from 'vue'

/**
 * EntryConnectionManager class
 * Manages connection states between entry output parameters and input parameters.
 *
 * Each connection represents a directed link from an output endpoint (typically an
 * output parameter of one entry) to an input endpoint (typically an input
 * parameter of another entry).
 *
 * Endpoint schema:
 *   { entryId: string, category: 'input'|'output', dataType: string, paramName: string }
 *
 * Connection schema:
 *   { id: string, output: Endpoint, input: Endpoint }
 */
export default class EntryConnectionManager {
  constructor() {
    // Map of connection id -> connection object (reactive for Vue computed tracking)
    this._connectionsById = reactive(new Map());
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Validate an endpoint object.
   * @param {Object} endpoint
   * @returns {boolean}
   * @private
   */
  _isValidEndpoint(endpoint) {
    if (!endpoint || typeof endpoint !== 'object') return false;
    const { entryId, category, dataType, paramName } = endpoint;
    if (!entryId || typeof entryId !== 'string') return false;
    if (category !== 'input' && category !== 'output') return false;
    if (!dataType || typeof dataType !== 'string') return false;
    if (!paramName || typeof paramName !== 'string') return false;
    return true;
  }

  /**
   * @param {{ entryId: string }} a
   * @param {{ entryId: string }} b
   * @returns {boolean}
   * @private
   */
  _endpointsMatch(a, b) {
    return a.entryId === b.entryId;
  }

  /**
   * @param {Object} output
   * @param {Object} input
   * @returns {boolean}
   * @private
   */
  _connectionExists(output, input) {
    for (const conn of this._connectionsById.values()) {
      if (
        conn.output.entryId === output.entryId &&
        conn.output.paramName === output.paramName &&
        conn.input.entryId === input.entryId &&
        conn.input.paramName === input.paramName
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate a UUID for a new connection.
   * @returns {string}
   * @private
   */
  _generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  /**
   * Add a new connection between an output and an input endpoint.
   * @param {Object} output - Output endpoint { entryId, category, dataType, paramName }
   * @param {Object} input  - Input endpoint { entryId, category, dataType, paramName }
   * @returns {string|null} The new connection id, or null if validation fails
   */
  addConnection(output, input) {
    if (!this._isValidEndpoint(output)) {
      console.error('EntryConnectionManager: invalid output endpoint', output);
      return null;
    }
    if (!this._isValidEndpoint(input)) {
      console.error('EntryConnectionManager: invalid input endpoint', input);
      return null;
    }

    if (this._endpointsMatch(output, input)) {
      console.warn('EntryConnectionManager: cannot connect an entry to itself', output, input);
      return null;
    }

    if (this._connectionExists(output, input)) {
      console.warn('EntryConnectionManager: connection already exists', output, input);
      return null;
    }

    const id = this._generateId();
    this._connectionsById.set(id, {
      id,
      output: { ...output },
      input: { ...input }
    });
    return id;
  }

  /**
   * Remove a connection by its id.
   * @param {string} connectionId
   * @returns {boolean} true if the connection was found and removed
   */
  removeConnection(connectionId) {
    return this._connectionsById.delete(connectionId);
  }

  /**
 * Remove all connections that involve the given entry id.
 * @param {string} entryId
 * @returns {number} Number of connections removed
 */
  removeConnectionsByEntryId(entryId) {
    let count = 0;
    for (const [id, conn] of this._connectionsById.entries()) {
      if (conn.output.entryId === entryId || conn.input.entryId === entryId) {
        this._connectionsById.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Get a connection by its id.
   * @param {string} connectionId
   * @returns {Object|null}
   */
  getConnection(connectionId) {
    return this._connectionsById.get(connectionId) || null;
  }

  /**
   * Get all connections as an array.
   * @returns {Array<Object>}
   */
  getConnections() {
    return Array.from(this._connectionsById.values());
  }

  /**
   * Get all connections that involve the given entry id
   * (either as output or input).
   * @param {string} entryId
   * @returns {Array<Object>}
   */
  getConnectionsByEntryId(entryId) {
    const result = [];
    for (const conn of this._connectionsById.values()) {
      if (conn.output.entryId === entryId || conn.input.entryId === entryId) {
        result.push(conn);
      }
    }
    return result;
  }

  /**
   * Get all connections for a specific parameter endpoint.
   * @param {string} entryId
   * @param {'input'|'output'} category
   * @param {string} paramName
   * @returns {Array<Object>}
   */
  getConnectionsByEndpoint(entryId, category, paramName) {
    const result = [];
    for (const conn of this._connectionsById.values()) {
      const out = conn.output;
      const inp = conn.input;
      if (
        (out.entryId === entryId && out.category === category && out.paramName === paramName) ||
        (inp.entryId === entryId && inp.category === category && inp.paramName === paramName)
      ) {
        result.push(conn);
      }
    }
    return result;
  }

  /**
   * Clear all connections.
   */
  clearConnections() {
    this._connectionsById.clear();
  }

  // ---------------------------------------------------------------------------
  // Serialisation / persistence
  // ---------------------------------------------------------------------------

  /**
   * Export all connection states as a plain JSON-serialisable object.
   * The returned structure can be saved to a file with JSON.stringify().
   * @returns {{ connections: Array<Object> }}
   */
  toJson() {
    return {
      connections: this.getConnections()
    };
  }

  /**
   * Restore connection states from a parsed JSON object.
   * Replaces all existing connections with the ones stored in the data.
   *
   * Expected JSON structure:
   * {
   *   "connections": [
   *     {
   *       "id": "<optional – overridden with a new uuid if omitted>",
   *       "output": { "entryId": "...", "category": "output", "dataType": "integer", "paramName": "result" },
   *       "input":  { "entryId": "...", "category": "input",  "dataType": "integer", "paramName": "value"  }
   *     }
   *   ]
   * }
   *
   * @param {Object} data - Parsed JSON object (from JSON.parse or FileService.readJsonFile)
   * @returns {number} Number of connections successfully restored
   */
  restoreFromJson(data) {
    this.clearConnections();

    if (!data || !Array.isArray(data.connections)) {
      console.warn('EntryConnectionManager.restoreFromJson: no valid "connections" array found');
      return 0;
    }

    let count = 0;
    data.connections.forEach((item, index) => {
      if (!this._isValidEndpoint(item.output)) {
        console.warn(`EntryConnectionManager.restoreFromJson: skipping connection[${index}] – invalid output`);
        return;
      }
      if (!this._isValidEndpoint(item.input)) {
        console.warn(`EntryConnectionManager.restoreFromJson: skipping connection[${index}] – invalid input`);
        return;
      }

      if (this._connectionExists(item.output, item.input)) {
        console.warn(`EntryConnectionManager.restoreFromJson: skipping duplicate connection[${index}]`);
        return;
      }

      const id = (item.id && typeof item.id === 'string') ? item.id : this._generateId();
      this._connectionsById.set(id, {
        id,
        output: { ...item.output },
        input: { ...item.input }
      });
      count++;
    });

    return count;
  }

  /**
   * Load and restore connection states from a JSON file using FileService.
   * @param {string} filePath - Path to the JSON file
   * @param {FileService} fileService - FileService instance for file I/O
   * @returns {Promise<number>} Number of connections successfully restored
   */
  async loadFromJsonFile(filePath, fileService) {
    try {
      const data = await fileService.readJsonFile(filePath);
      return this.restoreFromJson(data);
    } catch (error) {
      console.error(`EntryConnectionManager.loadFromJsonFile: failed to load "${filePath}": ${error.message}`);
      return 0;
    }
  }
}
