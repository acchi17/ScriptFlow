export default class SocketManager {
  constructor() {
    // entryId -> { socketId }
    this._entrySocketMap = new Map()
    // entryId -> { useTcpIp, host, port }
    this._entrySettingMap = new Map()
  }

  /**
   * Ask script-runner to create and connect a socket for an entry.
   * Destroys any existing socket for the entry before creating a new one.
   * Returns false if the connection fails.
   *
   * @param {string} entryId
   * @param {string} host
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  async create(entryId, host, port) {
    await this.release(entryId)
    const socketId = await window.electronAPI.createSocket(host, port)
    if (!socketId) return false
    this._entrySocketMap.set(entryId, { socketId })
    return true
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
   * Persist the user's intended communication settings for an entry.
   * Called before any connection attempt so settings survive failure.
   *
   * @param {string}  entryId
   * @param {boolean} useTcpIp
   * @param {string}  host
   * @param {number}  port
   */
  saveSetting(entryId, useTcpIp, host, port) {
    this._entrySettingMap.set(entryId, { useTcpIp, host, port })
  }

  /**
   * Return the stored communication settings for an entry, or null if none.
   *
   * @param {string} entryId
   * @returns {{ useTcpIp: boolean, host: string, port: number }|null}
   */
  getCommSetting(entryId) {
    const record = this._entrySettingMap.get(entryId)
    if (!record) return null
    return { useTcpIp: record.useTcpIp, host: record.host, port: record.port }
  }
}
