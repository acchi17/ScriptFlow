/**
 * Wraps a connected net.Socket with a send() that writes and resolves with the
 * next response chunk. Constructed by shared/script-runner.js and handed to a
 * user script's execute() as its second argument; only the script itself calls
 * send() — this class is not used by any other application code.
 */
export default class SocketComm {
  constructor(socket) {
    this._socket = socket
  }

  send(data) {
    return new Promise((resolve, reject) => {
      this._socket.once('data', resolve)
      this._socket.once('error', reject)
      this._socket.write(data)
    })
  }
}
