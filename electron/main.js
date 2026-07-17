const { app, BrowserWindow, ipcMain, utilityProcess, Menu } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

// Squirrel installer side-effects (Windows): exit early if invoked by the installer
try {
  if (require('electron-squirrel-startup')) {
    app.quit()
  }
} catch {
  // electron-squirrel-startup is optional; ignore if not installed
}

const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
const DEFS_FILENAME = 'BlockDefinitions.json'

let mainWindow = null
let scriptRunner = null
const pendingExecutions = new Map()
let executionCounter = 0

function getAppRootDir() {
  return app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : app.getAppPath()
}

function getUserScriptsDir() {
  return app.isPackaged
    ? path.join(getAppRootDir(), 'scripts')
    : path.join(app.getAppPath(), 'public', 'scripts')
}

function getUserSettingsDir() {
  return app.isPackaged
    ? path.join(getAppRootDir(), 'settings')
    : path.join(app.getAppPath(), 'public', 'settings')
}

function getDefaultsDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'public')
    : path.join(app.getAppPath(), 'public')
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function seedUserDirs() {
  const scriptsDir = getUserScriptsDir()
  const settingsDir = getUserSettingsDir()
  const defaultsDir = getDefaultsDir()

  if (!fs.existsSync(scriptsDir)) {
    copyDirRecursive(path.join(defaultsDir, 'scripts'), scriptsDir)
  }
  if (!fs.existsSync(path.join(settingsDir, DEFS_FILENAME))) {
    fs.mkdirSync(settingsDir, { recursive: true })
    const srcDefs = path.join(defaultsDir, 'settings', DEFS_FILENAME)
    if (fs.existsSync(srcDefs)) {
      fs.copyFileSync(srcDefs, path.join(settingsDir, DEFS_FILENAME))
    }
  }
}

function isInsideDir(parent, candidate) {
  const resolvedParent = path.resolve(parent) + path.sep
  const resolvedCandidate = path.resolve(candidate)
  return resolvedCandidate.startsWith(resolvedParent)
}

function resolveScriptPath(scriptName) {
  if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
    throw new Error(`Invalid script name: ${scriptName}`)
  }
  const scriptsDir = getUserScriptsDir()
  const resolved = path.join(scriptsDir, `${scriptName}.mjs`)
  if (!isInsideDir(scriptsDir, resolved)) {
    throw new Error(`Path escapes scripts directory: ${scriptName}`)
  }
  return resolved
}

function ensureScriptRunner() {
  if (scriptRunner) return scriptRunner

  // Both main.js and script-runner.js are bundled by Forge into the same
  // directory (.vite/build/ in dev, app.asar/.vite/build/ in prod), so __dirname
  // is the right anchor in either mode.
  const runnerPath = path.join(__dirname, 'script-runner.js')

  scriptRunner = utilityProcess.fork(runnerPath, [getUserScriptsDir()], {
    serviceName: 'scriptflow-runner',
    stdio: 'pipe'
  })

  scriptRunner.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return
    const { type, id, result, errmsg } = msg
    const pending = id != null ? pendingExecutions.get(id) : null
    if (type === 'result' && pending) {
      pending.resolve(result)
      pendingExecutions.delete(id)
    } else if (type === 'error' && pending) {
      pending.reject(new Error(errmsg || 'Unknown runner error'))
      pendingExecutions.delete(id)
    }
  })

  scriptRunner.on('exit', () => {
    for (const { reject } of pendingExecutions.values()) {
      reject(new Error('Script runner exited'))
    }
    pendingExecutions.clear()
    scriptRunner = null
  })

  if (scriptRunner.stdout) scriptRunner.stdout.on('data', d => console.log('[runner]', d.toString()))
  if (scriptRunner.stderr) scriptRunner.stderr.on('data', d => console.error('[runner]', d.toString()))

  return scriptRunner
}

function executeScriptInRunner(scriptName, inputParams) {
  if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
    return Promise.reject(new Error(`Invalid script name: ${scriptName}`))
  }
  const runner = ensureScriptRunner()
  const id = ++executionCounter
  return new Promise((resolve, reject) => {
    pendingExecutions.set(id, { resolve, reject })
    runner.postMessage({ type: 'execute', id, scriptName, inputParams })
    setTimeout(() => {
      if (pendingExecutions.has(id)) {
        pendingExecutions.get(id).reject(new Error(`Script execution timed out: ${scriptName}`))
        pendingExecutions.delete(id)
      }
    }, 10000)
  })
}

function createSocketInRunner(host, port) {
  const runner = ensureScriptRunner()
  const id = ++executionCounter
  return new Promise((resolve) => {
    pendingExecutions.set(id, { resolve, reject: resolve })
    runner.postMessage({ type: 'createSocket', id, host, port })
    setTimeout(() => {
      if (pendingExecutions.has(id)) {
        pendingExecutions.get(id).resolve(null)
        pendingExecutions.delete(id)
      }
    }, 10000)
  })
}

function destroySocketInRunner(socketId) {
  const runner = ensureScriptRunner()
  const id = ++executionCounter
  return new Promise((resolve) => {
    pendingExecutions.set(id, { resolve, reject: resolve })
    runner.postMessage({ type: 'destroySocket', id, socketId })
    setTimeout(() => {
      if (pendingExecutions.has(id)) {
        pendingExecutions.delete(id)
        resolve(false)
      }
    }, 5000)
  })
}

function registerIpcHandlers() {
  ipcMain.handle('scripts:list', async () => {
    const dir = getUserScriptsDir()
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.mjs'))
      .map(f => f.slice(0, -4))
      .filter(name => SCRIPT_NAME_PATTERN.test(name))
  })

  ipcMain.handle('scripts:read', async (_evt, scriptName) => {
    const filePath = resolveScriptPath(scriptName)
    return fs.readFileSync(filePath, 'utf8')
  })

  ipcMain.handle('scripts:save', async (_evt, scriptName, content) => {
    const filePath = resolveScriptPath(scriptName)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf8')
  })

  ipcMain.handle('defs:read', async () => {
    const filePath = path.join(getUserSettingsDir(), DEFS_FILENAME)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Block definitions file not found: ${filePath}`)
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  })

  ipcMain.handle('defs:write', async (_evt, data) => {
    const settingsDir = getUserSettingsDir()
    fs.mkdirSync(settingsDir, { recursive: true })
    const target = path.join(settingsDir, DEFS_FILENAME)
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, target)
  })

  ipcMain.handle('script:execute', async (_evt, scriptName, inputParams) => {
    return executeScriptInRunner(scriptName, inputParams)
  })

  ipcMain.handle('socket:create', async (_evt, host, port) => {
    return createSocketInRunner(host, port)
  })

  ipcMain.handle('socket:destroy', async (_evt, socketId) => {
    return destroySocketInRunner(socketId)
  })
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // MAIN_WINDOW_VITE_DEV_SERVER_URL and MAIN_WINDOW_VITE_NAME are injected by
  // @electron-forge/plugin-vite at build time. In dev the URL string is set;
  // in production the URL is replaced with `undefined`, so the loadFile branch
  // runs and resolves the bundled renderer index.html.
  // eslint-disable-next-line no-undef
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // eslint-disable-next-line no-undef
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    // eslint-disable-next-line no-undef
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  seedUserDirs()
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', (event) => {
  if (!scriptRunner) return
  event.preventDefault()
  const runner = scriptRunner
  scriptRunner = null
  const forceKill = setTimeout(() => { try { runner.kill() } catch { /* noop */ } }, 2000)
  runner.once('exit', () => { clearTimeout(forceKill); app.quit() })
  runner.postMessage({ type: 'shutdown' })
})
