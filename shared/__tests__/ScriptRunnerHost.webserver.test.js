import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import runScriptRunnerHostTests from './runScriptRunnerHostTests.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../appdata/scripts')
const jsRunnerPath = path.join(__dirname, '../script-runner.js')

// Runs the JS runner with the current Node binary, the same way
// server/index.js launches it (command = process.execPath).
runScriptRunnerHostTests({
  name: 'webserver',
  available: true,
  comTestScript: 'com-test',
  spawnRunner: (port) => spawn(
    process.execPath,
    [jsRunnerPath, String(port), scriptsDir],
    { windowsHide: true }
  )
})
