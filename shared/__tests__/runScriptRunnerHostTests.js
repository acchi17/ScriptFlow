import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import net from 'node:net'
import ScriptRunnerHost from '../ScriptRunnerHost.js'

/**
 * Registers the ScriptRunnerHost integration tests shared by every runner target.
 * Each target only differs in how the runner child process is spawned.
 *
 * @param {object} options
 * @param {string} options.name - target label used in describe titles
 * @param {boolean} options.available - false skips the suite (interpreter not installed)
 * @param {string} options.comTestScript - name of the script that reports whether the runner holds a socket
 *   (com-test.mjs / com_test.py differ in name per interpreter)
 * @param {(port: number) => import('node:child_process').ChildProcess} options.spawnRunner
 */
export default function runScriptRunnerHostTests({ name, available, comTestScript, spawnRunner }) {
  describe.skipIf(!available)(`ScriptRunnerHost (${name})`, () => {
    let host

    beforeEach(() => {
      host = new ScriptRunnerHost(spawnRunner)
    })

    afterEach(async () => {
      await host.shutdown()
    })

    it('executes the add script and returns its result', async () => {
      const result = await host.executeScript('add', { NumberA: 2, NumberB: 3 })
      expect(result).toEqual({ success: true, Result: 5 })
    })

    it('rejects when the target script does not exist', async () => {
      await expect(host.executeScript('nope', {})).rejects.toThrow()
    })

    it('rejects an invalid script name without spawning the worker', async () => {
      await expect(host.executeScript('../etc/passwd', {})).rejects.toThrow('Invalid script name')
    })

    it('terminates the child process on shutdown', async () => {
      let proc
      const ownHost = new ScriptRunnerHost((port) => {
        proc = spawnRunner(port)
        return proc
      })
      await ownHost.executeScript('add', { NumberA: 1, NumberB: 1 })
      expect(proc.exitCode).toBeNull()

      await ownHost.shutdown()

      expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true)
      // signal 0 only checks existence: throws ESRCH once the pid is gone
      expect(() => process.kill(proc.pid, 0)).toThrow()
    })

    it('exits by itself on shutdown while a script is running', async () => {
      let proc
      const ownHost = new ScriptRunnerHost((port) => {
        proc = spawnRunner(port)
        return proc
      })
      await ownHost.executeScript('add', { NumberA: 1, NumberB: 1 }) // connection established
      const running = ownHost.executeScript('sleep', { Milliseconds: 30000 })
      const rejected = expect(running).rejects.toThrow('shutting down')
      // execute is sent before shutdown on the same channel; give the runner time to start the script
      await new Promise((resolve) => setTimeout(resolve, 300))

      await ownHost.shutdown()
      await rejected

      // exit code 0 with no signal: the runner handled 'shutdown' itself instead of being force-killed
      expect(proc.exitCode).toBe(0)
      expect(proc.signalCode).toBeNull()
    })
  })

  // Each ScriptRunnerHost owns its own listen port and child process, as
  // RunnerHostRegistry creates one per entryId.
  describe.skipIf(!available)(`ScriptRunnerHost (two ${name} runners)`, () => {
    let hostA
    let hostB

    beforeEach(() => {
      hostA = new ScriptRunnerHost(spawnRunner)
      hostB = new ScriptRunnerHost(spawnRunner)
    })

    afterEach(async () => {
      await Promise.all([hostA.shutdown(), hostB.shutdown()])
    })

    it('runs scripts concurrently on separate processes without mixing results', async () => {
      const [a, b] = await Promise.all([
        hostA.executeScript('add', { NumberA: 1, NumberB: 2 }),
        hostB.executeScript('add', { NumberA: 10, NumberB: 20 })
      ])
      expect(a.Result).toBe(3)
      expect(b.Result).toBe(30)
      expect(hostA._process.pid).not.toBe(hostB._process.pid)
    })

    it('keeps the other runner working after one is shut down', async () => {
      await Promise.all([
        hostA.executeScript('add', { NumberA: 1, NumberB: 1 }),
        hostB.executeScript('add', { NumberA: 1, NumberB: 1 })
      ])
      await hostA.shutdown()
      const result = await hostB.executeScript('add', { NumberA: 4, NumberB: 5 })
      expect(result).toEqual({ success: true, Result: 9 })
    })
  })

  // The runner's script socket is only observable through the second argument
  // of execute(), which the comTestScript script reports as hasSocket and
  // exercises with write() (success is false when write() throws).
  describe.skipIf(!available)(`ScriptRunnerHost (${name} createSocket/destroySocket)`, () => {
    const WAIT = { timeout: 5000 }
    let host
    let server
    let serverPort
    let accepted // server-side sockets: { socket, closed, received }

    const runComTest = () => host.executeScript(comTestScript, {})
    const hasSocket = async () => (await runComTest()).hasSocket

    // Listens, remembers the port, then closes: nothing accepts connections on it.
    const getClosedPort = async () => {
      const tmp = net.createServer()
      await new Promise((resolve) => tmp.listen(0, '127.0.0.1', resolve))
      const { port } = tmp.address()
      await new Promise((resolve) => tmp.close(resolve))
      return port
    }

    beforeEach(async () => {
      host = new ScriptRunnerHost(spawnRunner)
      accepted = []
      server = net.createServer((socket) => {
        const entry = { socket, closed: false, received: '' }
        socket.on('data', (chunk) => { entry.received += chunk.toString() })
        socket.on('close', () => { entry.closed = true })
        socket.on('error', () => { /* noop */ })
        accepted.push(entry)
      })
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
      serverPort = server.address().port
    })

    afterEach(async () => {
      await host.shutdown()
      accepted.forEach(({ socket }) => socket.destroy())
      await new Promise((resolve) => server.close(resolve))
    })

    it('has no socket before createSocket', async () => {
      expect(await hasSocket()).toBe(false)
    })

    it('connects to a TCP server and holds the socket', async () => {
      expect(await host.createSocket('s1', '127.0.0.1', serverPort)).toBe(true)
      await vi.waitFor(() => expect(accepted).toHaveLength(1), WAIT)
      expect(await hasSocket()).toBe(true)
    })

    it('returns false when the connection fails, and still holds a socket', async () => {
      const closedPort = await getClosedPort()
      expect(await host.createSocket('s1', '127.0.0.1', closedPort)).toBe(false)
      expect(await hasSocket()).toBe(true)
    })

    it('writes to the server through the connected socket', async () => {
      await host.createSocket('s1', '127.0.0.1', serverPort)
      await vi.waitFor(() => expect(accepted).toHaveLength(1), WAIT)

      expect(await runComTest()).toEqual({ success: true, hasSocket: true })
      await vi.waitFor(() => expect(accepted[0].received).toBe('ping\n'), WAIT)
    })

    it('throws on write() after a failed connection', async () => {
      const closedPort = await getClosedPort()
      await host.createSocket('s1', '127.0.0.1', closedPort)

      const result = await runComTest()
      expect(result.success).toBe(false)
      expect(result.hasSocket).toBe(true)
      expect(result.errorMessage).toBeTruthy()
    })

    it('can connect after a failed connection', async () => {
      const closedPort = await getClosedPort()
      await host.createSocket('s1', '127.0.0.1', closedPort)
      expect(await host.createSocket('s2', '127.0.0.1', serverPort)).toBe(true)
      await vi.waitFor(() => expect(accepted).toHaveLength(1), WAIT)
    })

    it('closes the previous connection when createSocket is called again', async () => {
      await host.createSocket('s1', '127.0.0.1', serverPort)
      await host.createSocket('s2', '127.0.0.1', serverPort)
      await vi.waitFor(() => expect(accepted).toHaveLength(2), WAIT)
      await vi.waitFor(() => expect(accepted[0].closed).toBe(true), WAIT)
      expect(accepted[1].closed).toBe(false)
    })

    it('closes the connection and releases the socket on destroySocket', async () => {
      await host.createSocket('s1', '127.0.0.1', serverPort)
      await vi.waitFor(() => expect(accepted).toHaveLength(1), WAIT)

      expect(await host.destroySocket('s1')).toBe(true)

      await vi.waitFor(() => expect(accepted[0].closed).toBe(true), WAIT)
      expect(await hasSocket()).toBe(false)
    })

    it('returns true from destroySocket even when no socket exists', async () => {
      expect(await host.destroySocket('s1')).toBe(true)
    })
  })
}
