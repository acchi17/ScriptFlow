import { SCRIPT_NAME_PATTERN } from './appDataPaths.js'

/**
 * Manages a single forked script-runner child process (either an Electron
 * utilityProcess or a plain Node child_process), and the request/response
 * bookkeeping (pending promises, timeouts) around its message protocol.
 * Shared between the Electron main process and the Web server so both drive
 * the same shared/script-runner.js with the same message contract.
 *
 * @param {() => import('node:child_process').ChildProcess} forkFn Creates and
 *   returns the forked child process on first use.
 */
export default class RunnerHost {
  constructor(forkFn) {
    this._forkFn = forkFn
    this._process = null
    this._pending = new Map()
    this._counter = 0
  }

  _post(proc, message) {
    if (typeof proc.postMessage === 'function') {
      proc.postMessage(message)
    } else {
      proc.send(message)
    }
  }

  _ensureProcess() {
    if (this._process) return this._process

    const proc = this._forkFn()

    proc.on('message', (msg) => this._handleMessage(msg))
    proc.on('exit', () => {
      for (const { reject } of this._pending.values()) {
        reject(new Error('Script runner exited'))
      }
      this._pending.clear()
      this._process = null
    })
    if (proc.stdout) proc.stdout.on('data', d => console.log('[runner]', d.toString()))
    if (proc.stderr) proc.stderr.on('data', d => console.error('[runner]', d.toString()))

    this._process = proc
    return proc
  }

  _handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return
    const { type, id, result, errmsg } = msg
    const pending = id != null ? this._pending.get(id) : null
    if (type === 'result' && pending) {
      pending.resolve(result)
      this._pending.delete(id)
    } else if (type === 'error' && pending) {
      pending.reject(new Error(errmsg || 'Unknown runner error'))
      this._pending.delete(id)
    }
  }

  executeScript(scriptName, inputParams) {
    if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
      return Promise.reject(new Error(`Invalid script name: ${scriptName}`))
    }
    const proc = this._ensureProcess()
    const id = ++this._counter
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject })
      this._post(proc, { type: 'execute', id, scriptName, inputParams })
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.get(id).reject(new Error(`Script execution timed out: ${scriptName}`))
          this._pending.delete(id)
        }
      }, 10000)
    })
  }

  createSocket(host, port) {
    const proc = this._ensureProcess()
    const id = ++this._counter
    return new Promise((resolve) => {
      this._pending.set(id, { resolve, reject: resolve })
      this._post(proc, { type: 'createSocket', id, host, port })
      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.get(id).resolve(null)
          this._pending.delete(id)
        }
      }, 10000)
    })
  }

  destroySocket(socketId) {
    const proc = this._ensureProcess()
    const id = ++this._counter
    return new Promise((resolve) => {
      this._pending.set(id, { resolve, reject: resolve })
      this._post(proc, { type: 'destroySocket', id, socketId })
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
    return new Promise((resolve) => {
      if (!this._process) { resolve(); return }
      const proc = this._process
      this._process = null
      const forceKill = setTimeout(() => {
        try { proc.kill() } catch { /* noop */ }
      }, 2000)
      proc.once('exit', () => { clearTimeout(forceKill); resolve() })
      this._post(proc, { type: 'shutdown' })
    })
  }
}
