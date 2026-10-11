import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import runScriptRunnerHostTests from './runScriptRunnerHostTests.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const scriptsDir = path.join(__dirname, '../../appdata/scripts')
const jsRunnerPath = path.join(__dirname, '../script-runner.js')
const require = createRequire(import.meta.url)

function getElectronPath() {
  try {
    const electronPath = require('electron')
    return typeof electronPath === 'string' && fs.existsSync(electronPath) ? electronPath : null
  } catch {
    return null
  }
}

// Runs the Electron binary as plain Node (ELECTRON_RUN_AS_NODE), the same way
// electron/main.js launches the JS runner. Skipped when the electron package
// or its binary is not installed.
const electronPath = getElectronPath()

runScriptRunnerHostTests({
  name: 'electron',
  available: electronPath !== null,
  comTestScript: 'com-test',
  spawnRunner: (port) => spawn(
    electronPath,
    [jsRunnerPath, String(port), scriptsDir],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true }
  )
})
