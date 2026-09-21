/**
 * Pools ScriptRunnerHost/PythonRunnerHost instances keyed by entryId (the
 * root container's entry ID), so each recipe gets its own script-runner
 * child process instead of sharing one process app-wide. Shared between the
 * Electron main process and the Web server, mirroring how RunnerHost itself
 * is shared.
 *
 * @param {() => import('./ScriptRunnerHost.js').default | import('./PythonRunnerHost.js').default} createHostFn
 *   Creates a single RunnerHost instance. Does not take entryId: which
 *   interpreter to use is an app-wide setting, not per-entry.
 */
export default class RunnerHostRegistry {
  constructor(createHostFn) {
    this._createHostFn = createHostFn
    this._hosts = new Map()
  }

  get(entryId) {
    let host = this._hosts.get(entryId)
    if (!host) {
      host = this._createHostFn()
      this._hosts.set(entryId, host)
    }
    return host
  }

  shutdown(entryId) {
    const host = this._hosts.get(entryId)
    if (!host) return Promise.resolve()
    this._hosts.delete(entryId)
    return host.shutdown()
  }

  shutdownAll() {
    const hosts = [...this._hosts.values()]
    this._hosts.clear()
    return Promise.all(hosts.map(host => host.shutdown()))
  }
}
