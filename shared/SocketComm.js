import { EventEmitter } from 'node:events'

const DELIMITER = '\n'

/**
 * Wraps a connected net.Socket, framing messages on `DELIMITER` so callers
 * always deal in complete messages regardless of how TCP chunks the
 * underlying bytes. Used both as the control channel between a
 * ScriptRunnerHost and its child process, and (constructed by
 * shared/script-runner.js) as the object handed to a user script's
 * execute() for talking to an external host.
 *
 * - request(data): writes data and resolves with the next complete message —
 *   a single request/response round trip.
 * - write(data) / onMessage(callback): a continuous, independent pair used
 *   by control channels that exchange commands in either direction without
 *   a strict request/response order.
 *
 * 'close'/'error' from the underlying socket are re-emitted so callers can
 * react to disconnects. Once the underlying socket is destroyed, this
 * instance stays alive but write()/request() throw/reject instead of
 * touching the dead socket, so holders don't need to null out their
 * reference.
 */
export default class SocketComm extends EventEmitter {
  constructor(socket) {
    super()
    this._socket = socket
    this._buffer = ''
    this._messageListeners = []
    if (this._socket && !this._socket.destroyed) {
      this._socket.setNoDelay(true)
      this._socket.on('data', (chunk) => this._onData(chunk))
      this._socket.on('close', (hadError) => this.emit('close', hadError))
      this._socket.on('error', (err) => this.emit('error', err))
    }
  }

  _onData(chunk) {
    this._buffer += chunk.toString()
    let index
    while ((index = this._buffer.indexOf(DELIMITER)) !== -1) {
      const message = this._buffer.slice(0, index)
      this._buffer = this._buffer.slice(index + DELIMITER.length)
      for (const listener of [...this._messageListeners]) {
        listener(message)
      }
    }
  }

  onMessage(callback) {
    this._messageListeners.push(callback)
  }

  write(data) {
    if (!this._socket || this._socket.destroyed) {
      throw new Error(`${this.constructor.name}: socket is closed`)
    }
    this._socket.write(`${data}${DELIMITER}`)
  }

  request(data) {
    return new Promise((resolve, reject) => {
      if (!this._socket || this._socket.destroyed) {
        reject(new Error(`${this.constructor.name}: socket is closed`))
        return
      }
      let finished = false
      const finish = (fn, value) => {
        if (finished) return
        finished = true
        const index = this._messageListeners.indexOf(onMessage)
        if (index !== -1) this._messageListeners.splice(index, 1)
        this._socket.removeListener('error', onError)
        this._socket.removeListener('close', onClose)
        fn(value)
      }
      const onMessage = (msg) => finish(resolve, msg)
      const onError = (err) => finish(reject, err)
      const onClose = () => finish(reject, new Error('Socket closed before a response was received'))

      this._messageListeners.push(onMessage)
      this._socket.once('error', onError)
      this._socket.once('close', onClose)
      this.write(data)
    })
  }

  destroy() {
    if (!this._socket || this._socket.destroyed) return
    try { this._socket.destroy() } catch { /* noop */ }
  }
}
