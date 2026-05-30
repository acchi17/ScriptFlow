export default class SocketManager {
  constructor() {
    // entryId -> { socketId, host, port }
    this._entrySocketMap = new Map()
  }

  /**
   * Ask script-runner to create a socket for an entry and store host/port.
   * Does NOT connect. Returns false if the entry already has a socket or creation fails.
   *
   * @param {string} entryId
   * @param {string} host
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  async create(entryId, host, port) {
    if (this._entrySocketMap.has(entryId)) return false
    const socketId = await window.electronAPI.createSocket()
    if (!socketId) return false
    this._entrySocketMap.set(entryId, { socketId, host, port })
    return true
  }

  /**
   * Connect the socket held by an entry.
   * Returns false if no socket exists for the entry or the connection fails.
   *
   * @param {string} entryId
   * @returns {Promise<boolean>}
   */
  async connect(entryId) {
    const record = this._entrySocketMap.get(entryId)
    if (!record) return false
    const connected = await window.electronAPI.connectSocket(record.socketId, record.host, record.port)
    return !!connected
  }

  /**
   * Ask script-runner to close the socket held by an entry.
   *
   * @param {string} entryId
   * @returns {Promise<boolean>} true if a socket was released
   */
  async release(entryId) {
    const record = this._entrySocketMap.get(entryId)
    if (!record) return false
    this._entrySocketMap.delete(entryId)
    await window.electronAPI.destroySocket(record.socketId)
    return true
  }

  /**
   * Return the socket ID for an entry, or null if none.
   *
   * @param {string} entryId
   * @returns {string|null}
   */
  getSocketIdByEntry(entryId) {
    return this._entrySocketMap.get(entryId)?.socketId ?? null
  }

  /**
   * Return the stored host and port for an entry, or null if none.
   *
   * @param {string} entryId
   * @returns {{ host: string, port: number }|null}
   */
  getCommSettingByEntry(entryId) {
    const record = this._entrySocketMap.get(entryId)
    if (!record) return null
    return { host: record.host, port: record.port }
  }
}
