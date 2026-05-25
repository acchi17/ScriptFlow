/**
 * SocketManager class
 *
 * Creates, maintains, and destroys socket connections on behalf of other
 * classes (e.g. EntryExecutionService) so that the same physical socket can
 * be shared across multiple consumers and cleanly torn down on shutdown.
 *
 * Sockets are identified by a caller-supplied string key and are
 * reference-counted: a second `acquire(key, config)` for an already-open
 * socket returns the existing handle and bumps the ref-count instead of
 * opening a duplicate connection. `release(key)` decrements the count and
 * closes the underlying connection when it reaches zero.
 *
 * `config.type` selects the transport. The built-in implementation supports
 * `'websocket'` (works in both the browser/Worker and the Electron utility
 * process). Additional transports (e.g. raw TCP via `net.Socket`) can be
 * registered by passing a `transports` map to the constructor.
 */
export default class SocketManager {
  /**
   * @param {Object} [options]
   * @param {Object<string, {create: function(Object): Promise<Object>, destroy: function(Object): Promise<void>|void}>} [options.transports]
   *   Optional map of transport name → adapter. Each adapter must implement
   *   `create(config)` returning the socket handle, and `destroy(handle)`
   *   closing it. When omitted, the default WebSocket adapter is used.
   */
  constructor(options = {}) {
    // key -> { handle, refCount, type, config }
    this._sockets = new Map();
    // key -> Promise<handle> for in-flight acquire() calls, so concurrent
    // callers share a single connect attempt instead of racing.
    this._pending = new Map();

    this._transports = {
      websocket: {
        create: this._createWebSocket.bind(this),
        destroy: this._destroyWebSocket.bind(this)
      },
      ...(options.transports || {})
    };
  }

  /**
   * Acquire a socket by key. Creates it if absent, otherwise reuses the
   * existing handle and increments its reference count.
   *
   * @param {string} key Unique identifier for the socket
   * @param {Object} config Connection configuration
   * @param {string} [config.type='websocket'] Transport name
   * @returns {Promise<Object>} The socket handle
   */
  async acquire(key, config = {}) {
    if (!key) throw new Error('SocketManager.acquire(): key is required');

    const existing = this._sockets.get(key);
    if (existing) {
      existing.refCount++;
      return existing.handle;
    }

    const inFlight = this._pending.get(key);
    if (inFlight) {
      const handle = await inFlight;
      const entry = this._sockets.get(key);
      if (entry) entry.refCount++;
      return handle;
    }

    const type = config.type || 'websocket';
    const transport = this._transports[type];
    if (!transport) throw new Error(`SocketManager: unsupported socket type "${type}"`);

    const connectPromise = transport.create(config);
    this._pending.set(key, connectPromise);
    try {
      const handle = await connectPromise;
      this._sockets.set(key, { handle, refCount: 1, type, config });
      return handle;
    } finally {
      this._pending.delete(key);
    }
  }

  /**
   * Release a reference to a socket. When the reference count drops to
   * zero the underlying connection is closed and removed from the registry.
   *
   * @param {string} key
   * @returns {Promise<boolean>} true if a socket was released
   */
  async release(key) {
    const entry = this._sockets.get(key);
    if (!entry) return false;

    entry.refCount--;
    if (entry.refCount > 0) return true;

    this._sockets.delete(key);
    await this._safeDestroy(entry);
    return true;
  }

  /**
   * Force-close and remove a socket regardless of its reference count.
   * Useful for error recovery or when a caller knows the connection has
   * become unusable.
   *
   * @param {string} key
   * @returns {Promise<boolean>} true if a socket was destroyed
   */
  async destroy(key) {
    const entry = this._sockets.get(key);
    if (!entry) return false;

    this._sockets.delete(key);
    await this._safeDestroy(entry);
    return true;
  }

  /**
   * Close every managed socket. Intended to be called from the owning
   * service's `terminate()` method on application shutdown.
   *
   * @returns {Promise<void>}
   */
  async terminate() {
    const entries = Array.from(this._sockets.values());
    this._sockets.clear();
    this._pending.clear();
    await Promise.allSettled(entries.map(entry => this._safeDestroy(entry)));
  }

  /**
   * Return the handle for an existing socket without affecting its
   * reference count, or null if no socket is registered under `key`.
   *
   * @param {string} key
   * @returns {Object|null}
   */
  get(key) {
    const entry = this._sockets.get(key);
    return entry ? entry.handle : null;
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this._sockets.has(key);
  }

  /**
   * @returns {string[]} The keys of all currently registered sockets.
   */
  list() {
    return Array.from(this._sockets.keys());
  }

  /**
   * Current reference count for a socket, or 0 if not registered.
   * @param {string} key
   * @returns {number}
   */
  refCount(key) {
    const entry = this._sockets.get(key);
    return entry ? entry.refCount : 0;
  }

  /**
   * Invoke the transport's destroy() while swallowing errors so that
   * terminate()/release() never throw on cleanup.
   * @private
   */
  async _safeDestroy(entry) {
    try {
      const transport = this._transports[entry.type];
      if (transport && typeof transport.destroy === 'function') {
        await transport.destroy(entry.handle);
      }
    } catch (error) {
      console.log(`[SocketManager] destroy failed: ${error.message}`);
    }
  }

  /**
   * Default WebSocket transport. Resolves once the connection is open.
   * @private
   */
  _createWebSocket(config) {
    if (typeof WebSocket === 'undefined') {
      return Promise.reject(new Error('WebSocket is not available in this environment'));
    }
    if (!config.url) {
      return Promise.reject(new Error('SocketManager: websocket config requires "url"'));
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(config.url, config.protocols);
      const onOpen = () => {
        if (settled) return;
        settled = true;
        ws.removeEventListener('error', onError);
        resolve(ws);
      };
      const onError = (event) => {
        if (settled) return;
        settled = true;
        ws.removeEventListener('open', onOpen);
        reject(new Error(`WebSocket connection failed: ${event?.message || 'unknown error'}`));
      };
      ws.addEventListener('open', onOpen, { once: true });
      ws.addEventListener('error', onError, { once: true });
    });
  }

  /**
   * @private
   */
  _destroyWebSocket(handle) {
    if (!handle) return;
    // WebSocket readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
    if (handle.readyState === 0 || handle.readyState === 1) {
      try { handle.close(); } catch { /* ignore */ }
    }
  }
}
