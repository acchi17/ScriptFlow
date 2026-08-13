import { ref } from 'vue'
import { World } from '../ecs/core/World'

/**
 * EntryConnectionHandler class
 * Handles connection states between entry output parameters and input parameters.
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
 *
 * Each connection is itself spawned as an entity in the ECS world, carrying a
 * single EntryConnectionComponent ({ output, input }); the entity id is the
 * connection id.
 */
export default class EntryConnectionHandler {
  constructor(world = new World()) {
    // ECS world holding connection components
    this._world = world;
    // Reactive counter incremented on every connection change (add/remove/clear/restore).
    // ComponentStore wraps a plain Map, so Vue can't auto-track reads through it -
    // consumers must read this tick inside a computed() before calling a getter below.
    this._connectionsTick = ref(0);
  }

  /**
   * Reactive counter that increments whenever the set of connections changes.
   * Watch/read this to react to connection changes without deep reactivity.
   * @returns {import('vue').Ref<number>}
   */
  get connectionsTick() {
    return this._connectionsTick;
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
    for (const [, conn] of this._world.connections.entries()) {
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

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  /**
   * Add a new connection between an output and an input endpoint.
   * @param {Object} output - Output endpoint { entryId, category, dataType, paramName }
   * @param {Object} input  - Input endpoint { entryId, category, dataType, paramName }
   * @param {string|null} preferredId - Optional id to spawn the connection under (e.g. when restoring)
   * @returns {string|null} The new connection id, or null if validation fails
   */
  addConnection(output, input, preferredId = null) {
    if (!this._isValidEndpoint(output)) {
      console.error('EntryConnectionHandler: invalid output endpoint', output);
      return null;
    }
    if (!this._isValidEndpoint(input)) {
      console.error('EntryConnectionHandler: invalid input endpoint', input);
      return null;
    }

    if (this._endpointsMatch(output, input)) {
      console.warn('EntryConnectionHandler: cannot connect an entry to itself', output, input);
      return null;
    }

    if (this._connectionExists(output, input)) {
      console.warn('EntryConnectionHandler: connection already exists', output, input);
      return null;
    }

    const id = this._world.spawn(preferredId);
    this._world.connections.add(id, {
      output: { ...output },
      input: { ...input }
    });
    this._connectionsTick.value++;
    return id;
  }

  /**
   * Remove a connection by its id.
   * @param {string} connectionId
   * @returns {boolean} true if the connection was found and removed
   */
  removeConnection(connectionId) {
    if (!this._world.connections.has(connectionId)) return false;
    this._world.despawn(connectionId);
    this._connectionsTick.value++;
    return true;
  }

  /**
 * Remove all connections that involve the given entry id.
 * @param {string} entryId
 * @returns {number} Number of connections removed
 */
  removeConnectionsByEntryId(entryId) {
    const ids = [];
    for (const [id, conn] of this._world.connections.entries()) {
      if (conn.output.entryId === entryId || conn.input.entryId === entryId) {
        ids.push(id);
      }
    }
    ids.forEach(id => this._world.despawn(id));
    if (ids.length) this._connectionsTick.value++;
    return ids.length;
  }

  /**
   * Get a connection by its id.
   * @param {string} connectionId
   * @returns {Object|null}
   */
  getConnection(connectionId) {
    const conn = this._world.connections.get(connectionId);
    return conn ? { id: connectionId, output: conn.output, input: conn.input } : null;
  }

  /**
   * Get all connections as an array.
   * @returns {Array<Object>}
   */
  getConnections() {
    const result = [];
    for (const [id, conn] of this._world.connections.entries()) {
      result.push({ id, output: conn.output, input: conn.input });
    }
    return result;
  }

  /**
   * Get all connections that involve the given entry id
   * (either as output or input).
   * @param {string} entryId
   * @returns {Array<Object>}
   */
  getConnectionsByEntryId(entryId) {
    const result = [];
    for (const [id, conn] of this._world.connections.entries()) {
      if (conn.output.entryId === entryId || conn.input.entryId === entryId) {
        result.push({ id, output: conn.output, input: conn.input });
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
    for (const [id, conn] of this._world.connections.entries()) {
      const out = conn.output;
      const inp = conn.input;
      if (
        (out.entryId === entryId && out.category === category && out.paramName === paramName) ||
        (inp.entryId === entryId && inp.category === category && inp.paramName === paramName)
      ) {
        result.push({ id, output: conn.output, input: conn.input });
      }
    }
    return result;
  }

  /**
   * Clear all connections.
   */
  clearConnections() {
    const ids = Array.from(this._world.connections.entries(), ([id]) => id);
    ids.forEach(id => this._world.despawn(id));
    if (ids.length) this._connectionsTick.value++;
  }
}
