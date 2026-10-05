import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ScriptRunnerHost from '../ScriptRunnerHost.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../appdata/scripts')
const pythonRunnerPath = path.join(__dirname, '../../appdata/python/script_runner.py')

function isPythonAvailable() {
  const result = spawnSync('python', ['--version'])
  return result.status === 0
}

// Integration test: spawns the real appdata/python/script_runner.py over the TCP
// control channel, exercising the same path electron/main.js and
// server/index.js use when AppSettings.json's interpreter is "python".
// Skipped in environments with no "python" on PATH.
describe.skipIf(!isPythonAvailable())('ScriptRunnerHost (python runner)', () => {
  let host

  beforeEach(() => {
    host = new ScriptRunnerHost((port) => spawn('python', [pythonRunnerPath, String(port), scriptsDir]))
  })

  afterEach(async () => {
    await host.shutdown()
  })

  it('executes appdata/scripts/add.py and returns its result', async () => {
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
      proc = spawn('python', [pythonRunnerPath, String(port), scriptsDir])
      return proc
    })
    await ownHost.executeScript('add', { NumberA: 1, NumberB: 1 })
    expect(proc.exitCode).toBeNull()

    await ownHost.shutdown()

    expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true)
    // signal 0 only checks existence: throws ESRCH once the pid is gone
    expect(() => process.kill(proc.pid, 0)).toThrow()
  })
})

// Each ScriptRunnerHost owns its own listen port and child process, as
// RunnerHostRegistry creates one per entryId.
describe.skipIf(!isPythonAvailable())('ScriptRunnerHost (two python runners)', () => {
  let hostA
  let hostB

  const createHost = () => new ScriptRunnerHost(
    (port) => spawn('python', [pythonRunnerPath, String(port), scriptsDir])
  )

  beforeEach(() => {
    hostA = createHost()
    hostB = createHost()
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

// Runs the Electron binary as plain Node (ELECTRON_RUN_AS_NODE), the same way
// electron/main.js launches the JS runner. Skipped when the electron package
// or its binary is not installed.
const require = createRequire(import.meta.url)
const jsRunnerPath = path.join(__dirname, '../script-runner.js')

function getElectronPath() {
  try {
    const electronPath = require('electron')
    return typeof electronPath === 'string' && fs.existsSync(electronPath) ? electronPath : null
  } catch {
    return null
  }
}

describe.skipIf(!getElectronPath())('ScriptRunnerHost (JS runner on Electron as Node)', () => {
  let host

  beforeEach(() => {
    host = new ScriptRunnerHost((port) => spawn(
      getElectronPath(),
      [jsRunnerPath, String(port), scriptsDir],
      { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true }
    ))
  })

  afterEach(async () => {
    await host.shutdown()
  })

  it('executes appdata/scripts/add.mjs and returns its result', async () => {
    const result = await host.executeScript('add', { NumberA: 2, NumberB: 3 })
    expect(result).toEqual({ success: true, Result: 5 })
  })

  it('rejects when the target script does not exist', async () => {
    await expect(host.executeScript('nope', {})).rejects.toThrow()
  })
})
