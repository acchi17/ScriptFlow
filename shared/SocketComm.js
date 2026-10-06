import { EventEmitter } from 'node:events'

const DELIMITER = '\n'

/**
 * - request(data): writes data and resolves with the next complete message —
 *   a single request/response round trip.
 * - write(data) / onMessage(callback): a continuous, independent pair used
 *   by control channels that exchange commands in either direction without
 *   a strict request/response order.
 * - end() / destroy(): end() flushes pending writes and sends FIN, resolving
 *   once the socket has fully closed (i.e. the peer has closed too) — use it
 *   before exiting on a channel whose peer should see a clean close. Rejects
 *   if not closed within timeoutMs (the socket is left as is; call destroy()
 *   to force it down). timeoutMs = 0 waits indefinitely. destroy() tears down immediately
 *   with nothing to wait for.
 */
export default class SocketComm extends EventEmitter {
  constructor(socket) {
    super()
    this._socket = socket
    this._buffer = ''
    this._messageListeners = []
    if (!this._isClosed(this._socket)) {
      this._socket.setNoDelay(true)
      this._socket.on('data', (chunk) => this._onData(chunk))
      this._socket.on('close', (hadError) => this.emit('close', hadError))
      this._socket.on('error', (err) => this.emit('error', err))
    }
  }

  _isClosed(socket) {
    return !socket || socket.destroyed
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
    if (this._socket?.writableEnded || this._isClosed(this._socket)) {
      throw new Error(`${this.constructor.name}: socket is closed`)
    }
    this._socket.write(`${data}${DELIMITER}`)
  }

  request(data) {
    return new Promise((resolve, reject) => {
      if (this._isClosed(this._socket)) {
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
      try {
        this.write(data)
      } catch (err) {
        finish(reject, err)
      }
    })
  }

  end(timeoutMs = 0) {
    return new Promise((resolve, reject) => {
      if (this._isClosed(this._socket)) {
        resolve()
        return
      }
      const timer = timeoutMs > 0
        ? setTimeout(() => {
          reject(new Error(`${this.constructor.name}: end() timed out after ${timeoutMs}ms`))
        }, timeoutMs)
        : null
      this._socket.once('close', () => {
        clearTimeout(timer)
        resolve()
      })
      this._socket.end()
    })
  }

  destroy() {
    if (this._isClosed(this._socket)) return
    try { this._socket.destroy() } catch { /* noop */ }
  }
}
