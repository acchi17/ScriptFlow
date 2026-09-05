import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PythonRunnerHost from '../PythonRunnerHost.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../appdata/scripts')
const pythonRunnerPath = path.join(__dirname, '../../appdata/script_runner.py')

function isPythonAvailable() {
  const result = spawnSync('python', ['--version'])
  return result.status === 0
}

// Integration test: spawns the real appdata/script_runner.py over its NDJSON
// stdio protocol, exercising the same path electron/main.js and
// server/index.js use when AppSettings.json's interpreter is "python".
// Skipped in environments with no "python" on PATH.
describe.skipIf(!isPythonAvailable())('PythonRunnerHost', () => {
  let host

  beforeEach(() => {
    host = new PythonRunnerHost(() => spawn('python', [pythonRunnerPath, scriptsDir]))
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
})
