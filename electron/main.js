// shared/*.js are real ES modules; Rollup traces these imports and inlines
// them directly into this bundle, so no separate Forge build entry (and no
// runtime file lookup) is needed for them.
import { createAppPaths, SCRIPT_NAME_PATTERN, DEFS_FILENAME } from '../shared/appPaths.js'
import RunnerHost from '../shared/RunnerHost.js'

const { app, BrowserWindow, ipcMain, utilityProcess, Menu, dialog } = require('electron')
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

let mainWindow = null
let appPaths = null
let runnerHost = null

function getRootDir() {
  return app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : path.join(app.getAppPath(), 'public')
}

function getDefaultsDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'public')
    : path.join(app.getAppPath(), 'public')
}

function ensureRunnerHost() {
  if (runnerHost) return runnerHost

  // Both main.cjs and script-runner.cjs are bundled by Forge into the same
  // directory (.vite/build/ in dev, app.asar/.vite/build/ in prod), so __dirname
  // is the right anchor in either mode.
  const runnerPath = path.join(__dirname, 'script-runner.cjs')

  runnerHost = new RunnerHost(() => utilityProcess.fork(runnerPath, [appPaths.scriptsDir], {
    serviceName: 'scriptflow-runner',
    stdio: 'pipe'
  }))

  return runnerHost
}

function registerIpcHandlers() {
  ipcMain.handle('scripts:list', async () => {
    const dir = appPaths.scriptsDir
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.mjs'))
      .map(f => f.slice(0, -4))
      .filter(name => SCRIPT_NAME_PATTERN.test(name))
  })

  ipcMain.handle('scripts:read', async (_evt, scriptName) => {
    const filePath = appPaths.resolveScriptPath(scriptName)
    return fs.readFileSync(filePath, 'utf8')
  })

  ipcMain.handle('scripts:save', async (_evt, scriptName, content) => {
    const filePath = appPaths.resolveScriptPath(scriptName)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf8')
  })

  ipcMain.handle('defs:read', async () => {
    const filePath = path.join(appPaths.settingsDir, DEFS_FILENAME)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Block definitions file not found: ${filePath}`)
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  })

  ipcMain.handle('defs:write', async (_evt, data) => {
    const settingsDir = appPaths.settingsDir
    fs.mkdirSync(settingsDir, { recursive: true })
    const target = path.join(settingsDir, DEFS_FILENAME)
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, target)
  })

  ipcMain.handle('recipe:saveAs', async (_evt, data, suggestedName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: suggestedName || 'recipe.json',
      filters: [{ name: 'Recipe JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8')
    return result.filePath
  })

  ipcMain.handle('recipe:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Recipe JSON', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return { fileName: path.basename(filePath), data }
  })

  ipcMain.handle('script:execute', async (_evt, scriptName, inputParams) => {
    return ensureRunnerHost().executeScript(scriptName, inputParams)
  })

  ipcMain.handle('socket:create', async (_evt, host, port) => {
    return ensureRunnerHost().createSocket(host, port)
  })

  ipcMain.handle('socket:destroy', async (_evt, socketId) => {
    return ensureRunnerHost().destroySocket(socketId)
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
      preload: path.join(__dirname, 'preload.cjs')
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
  appPaths = createAppPaths({ rootDir: getRootDir(), defaultsDir: getDefaultsDir() })
  appPaths.seed()
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
  if (!runnerHost) return
  event.preventDefault()
  const host = runnerHost
  runnerHost = null
  host.shutdown().then(() => app.quit())
})
