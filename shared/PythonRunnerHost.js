import { SCRIPT_NAME_PATTERN } from './appDataPaths.js'

/**
 * Manages a single spawned Python worker process (appdata/script_runner.py)
 * and the request/response bookkeeping (pending promises, timeouts) around
 * its message protocol. Structurally mirrors RunnerHost (same
 * executeScript/shutdown shape), but the Python worker is a plain
 * child_process.spawn'd process that can't join Node's native
 * child_process IPC channel, so it speaks newline-delimited JSON (NDJSON)
 * over plain stdin/stdout instead.
 *
 * @param {() => import('node:child_process').ChildProcess} forkFn Creates and
 *   returns the spawned Python worker process on first use.
 */
export default class PythonRunnerHost {
  constructor(forkFn) {
    this._forkFn = forkFn
    this._process = null
    this._pending = new Map()
    this._counter = 0
    this._buffer = ''
  }

  _post(proc, message) {
    proc.stdin.write(`${JSON.stringify(message)}\n`)
  }

  _ensureProcess() {
    if (this._process) return this._process

    const proc = this._forkFn()

    proc.stdout.on('data', (chunk) => this._handleChunk(chunk))
    if (proc.stderr) proc.stderr.on('data', d => console.error('[python-runner]', d.toString()))
    const onGone = (error) => {
      for (const { reject } of this._pending.values()) {
        reject(error || new Error('Python runner exited'))
      }
      this._pending.clear()
      this._process = null
    }
    proc.on('error', (error) => onGone(new Error(`Failed to start Python interpreter: ${error.message}`)))
    proc.on('exit', () => onGone())

    this._process = proc
    return proc
  }

  /**
   * Reassemble NDJSON lines that may be split across 'data' events and hand
   * each complete line to _handleMessage.
   */
  _handleChunk(chunk) {
    this._buffer += chunk.toString()
    let newlineIndex
    while ((newlineIndex = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.slice(0, newlineIndex)
      this._buffer = this._buffer.slice(newlineIndex + 1)
      if (line.trim()) this._handleMessage(line)
    }
  }

  _handleMessage(line) {
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      return
    }
    if (!msg || typeof msg !== 'object') return
    const { type, id, result, errmsg } = msg
    const pending = id != null ? this._pending.get(id) : null
    if (type === 'result' && pending) {
      pending.resolve(result)
      this._pending.delete(id)
    } else if (type === 'error' && pending) {
      pending.reject(new Error(errmsg || 'Unknown python runner error'))
      this._pending.delete(id)
    }
  }

  executeScript(scriptName, inputParams) {
    if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
      return Promise.reject(new Error(`Invalid script name: ${scriptName}`))
    }
    let proc
    try {
      proc = this._ensureProcess()
    } catch (error) {
      return Promise.reject(error)
    }
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

  /**
   * Python scripts don't get TCP socket passthrough (JS-only feature).
   * Stubbed the same "never reject" way RunnerHost's own createSocket does,
   * so socket:create/socket:destroy IPC handlers stay safe regardless of
   * which interpreter is active.
   */
  createSocket() {
    return Promise.resolve(null)
  }

  destroySocket() {
    return Promise.resolve(false)
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
