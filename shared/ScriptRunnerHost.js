import net from 'node:net'
import { SCRIPT_NAME_PATTERN } from './appDataPaths.js'
import SocketComm from './SocketComm.js'

/**
 * Manages a single script-runner child process (JS or Python interpreter)
 * over a TCP control channel, and the request/response bookkeeping (pending
 * promises, timeouts) around its message protocol. Shared between the
 * Electron main process and the Web server so both drive the same child
 * process contract regardless of interpreter.
 *
 * Connection sequence: listen on 127.0.0.1 with an OS-assigned port, spawn
 * the child with that port, accept its first (and only) connection, then
 * stop listening. Every method awaits this sequence before sending.
 *
 * @param {(port: number) => import('node:child_process').ChildProcess} spawnFn
 *   Creates and returns the spawned child process on first use, given the
 *   port it should connect back to. The child expects this port as its
 *   first argv argument, followed by scriptsDir.
 */
export default class ScriptRunnerHost {
  constructor(spawnFn) {
    this._spawnFn = spawnFn
    this._process = null
    this._socketComm = null
    this._connectionPromise = null
    this._pending = new Map()
    this._counter = 0
  }

  _ensureConnection() {
    if (this._connectionPromise) return this._connectionPromise

    this._connectionPromise = new Promise((resolve, reject) => {
      let connected = false
      const server = net.createServer()
      server.on('error', reject)
      server.listen(0, '127.0.0.1', () => {
        // Process creation
        const port = server.address().port
        let proc
        try {
          proc = this._spawnFn(port)
        } catch (error) {
          server.close()
          reject(error)
          return
        }

        // Process monitoring setup
        if (proc.stdout) proc.stdout.on('data', d => console.log('[runner]', d.toString()))
        if (proc.stderr) proc.stderr.on('data', d => console.error('[runner]', d.toString()))

        const onGone = (error) => {
          if (this._process !== proc) return
          if (connected) {
            this._handleDisconnect(error)
          } else {
            server.close()
            reject(error)
          }
        }
        proc.on('error', (error) => onGone(new Error(`Failed to start script runner: ${error.message}`)))
        proc.on('exit', (code, signal) => onGone(new Error(`Script runner exited (code=${code}, signal=${signal})`)))
        this._process = proc

        // Connection acceptance
        server.once('connection', (socket) => {
          connected = true
          server.close()
          const socketComm = new SocketComm(socket)
          socketComm.onMessage((msg) => this._handleMessage(msg))
          socketComm.on('close', () => {
            if (this._socketComm !== socketComm) return
            this._handleDisconnect()
          })
          this._socketComm = socketComm
          resolve(socketComm)
        })
      })
    })

    return this._connectionPromise
  }

  _handleMessage(msg) {
    let parsed
    try {
      parsed = JSON.parse(msg)
    } catch {
      return
    }
    if (!parsed || typeof parsed !== 'object') return
    const { type, id, result, errmsg } = parsed
    const pending = id != null ? this._pending.get(id) : null
    if (type === 'result' && pending) {
      pending.resolve(result)
      this._pending.delete(id)
    } else if (type === 'error' && pending) {
      pending.reject(new Error(errmsg || 'Unknown runner error'))
      this._pending.delete(id)
    }
  }

  _handleDisconnect(error) {
    for (const { reject } of this._pending.values()) {
      reject(error || new Error('Disconnected from script runner'))
    }
    this._pending.clear()
    this._process = null
    this._socketComm = null
    this._connectionPromise = null
  }

  /**
   * Waits for proc to exit on its own, force-killing it after a 2 second
   * grace period if it doesn't. Resolves once the process is gone either way.
   * @returns {Promise<void>}
   */
  _forceKillAfterGracePeriod(proc) {
    return new Promise((resolve) => {
      const forceKill = setTimeout(() => {
        try { proc.kill() } catch { /* noop */ }
      }, 2000)
      proc.once('exit', () => { clearTimeout(forceKill); resolve() })
    })
  }

  _post(message) {
    this._socketComm.write(JSON.stringify(message))
  }

  async executeScript(scriptName, inputParams) {
    if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
      throw new Error(`Invalid script name: ${scriptName}`)
    }
    await this._ensureConnection()
    const id = ++this._counter
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject })
      this._post({ type: 'execute', id, scriptName, inputParams })
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.get(id).reject(new Error(`Script execution timed out: ${scriptName}`))
          this._pending.delete(id)
        }
      }, 10000)
    })
  }

  async createSocket(socketId, host, port) {
    await this._ensureConnection()
    const id = ++this._counter
    return new Promise((resolve) => {
      this._pending.set(id, { resolve, reject: resolve })
      this._post({ type: 'createSocket', id, socketId, host, port })
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.get(id).resolve(null)
          this._pending.delete(id)
        }
      }, 10000)
    })
  }

  async destroySocket(socketId) {
    await this._ensureConnection()
    const id = ++this._counter
    return new Promise((resolve) => {
      this._pending.set(id, { resolve, reject: resolve })
      this._post({ type: 'destroySocket', id, socketId })
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.delete(id)
          resolve(false)
        }
      }, 5000)
    })
  }

  /**
   * Ask the runner to shut down gracefully, force-killing it after a grace
   * period if it doesn't exit on its own. Resolves once the process is gone.
   * @returns {Promise<void>}
   */
  shutdown() {
    if (!this._process) return Promise.resolve()
    const proc = this._process
    const connectionPromise = this._connectionPromise
    this._handleDisconnect(new Error('Script runner is shutting down'))

    connectionPromise
      .then((socketComm) => socketComm.write(JSON.stringify({ type: 'shutdown' })))
      .catch(() => { /* never connected; forceKill will handle it */ })

    return this._forceKillAfterGracePeriod(proc)
  }
}
