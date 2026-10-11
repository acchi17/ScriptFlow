import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import runScriptRunnerHostTests from './runScriptRunnerHostTests.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../appdata/scripts')
const pythonRunnerPath = path.join(__dirname, '../../appdata/python/script_runner.py')

function isPythonAvailable() {
  const result = spawnSync('python', ['--version'])
  return result.status === 0
}

// Spawns the real appdata/python/script_runner.py, as electron/main.js and
// server/index.js do when AppSettings.json's interpreter is "python".
// Skipped in environments with no "python" on PATH.
runScriptRunnerHostTests({
  name: 'python',
  available: isPythonAvailable(),
  comTestScript: 'com_test',
  spawnRunner: (port) => spawn('python', [pythonRunnerPath, String(port), scriptsDir])
})
