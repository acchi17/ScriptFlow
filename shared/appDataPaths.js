import path from 'node:path'
import fs from 'node:fs'

export const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
export const DEFS_FILENAME = 'BlockDefinitions.json'
export const APP_SETTINGS_FILENAME = 'AppSettings.json'

const DEFAULT_APP_SETTINGS = { script: { interpreterName: 'javascript', interpreterPath: '' } }

/**
 * Read <settingsDir>/AppSettings.json, merged onto defaults. Falls back to
 * the defaults entirely on any read/parse error (missing file, corrupt
 * JSON) — this setting must never be able to crash host startup.
 * @param {string} settingsDir
 * @returns {{ script: { interpreterName: string, interpreterPath: string } }}
 */
export function readAppSettings(settingsDir) {
  try {
    const raw = fs.readFileSync(path.join(settingsDir, APP_SETTINGS_FILENAME), 'utf8')
    const parsed = JSON.parse(raw)
    return { script: { ...DEFAULT_APP_SETTINGS.script, ...(parsed.script || {}) } }
  } catch {
    return DEFAULT_APP_SETTINGS
  }
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

function isInsideDir(parent, candidate) {
  const resolvedParent = path.resolve(parent) + path.sep
  const resolvedCandidate = path.resolve(candidate)
  return resolvedCandidate.startsWith(resolvedParent)
}

/**
 * Resolve the scripts/settings directories for an app instance and provide
 * path-traversal-safe script path resolution plus first-run seeding from a
 * defaults directory. Shared between the Electron main process and the Web
 * server so both target the same on-disk layout (<rootDir>/scripts,
 * <rootDir>/settings/BlockDefinitions.json).
 *
 * @param {Object} opts
 * @param {string} opts.rootDir Directory that owns `scripts/` and `settings/`
 * @param {string} opts.defaultsDir Directory to seed `scripts/`/`settings/` from on first run
 */
export function createAppDataPaths({ rootDir, defaultsDir }) {
  const scriptsDir = path.join(rootDir, 'scripts')
  const settingsDir = path.join(rootDir, 'settings')

  function resolveScriptPath(scriptName) {
    if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
      throw new Error(`Invalid script name: ${scriptName}`)
    }
    const resolved = path.join(scriptsDir, `${scriptName}.mjs`)
    if (!isInsideDir(scriptsDir, resolved)) {
      throw new Error(`Path escapes scripts directory: ${scriptName}`)
    }
    return resolved
  }

  function seed() {
    const defsPath = path.join(settingsDir, DEFS_FILENAME)
    if (!fs.existsSync(scriptsDir) || !fs.existsSync(defsPath)) {
      copyDirRecursive(defaultsDir, rootDir)
    }

    // Independent, non-destructive backfill: an existing install upgrading
    // to a version that introduced AppSettings.json already has scriptsDir
    // and defsPath, so the check above no-ops — copy just this one file
    // instead of re-running copyDirRecursive (which would clobber any
    // hand-edited BlockDefinitions.json/scripts).
    const appSettingsPath = path.join(settingsDir, APP_SETTINGS_FILENAME)
    if (!fs.existsSync(appSettingsPath)) {
      const defaultAppSettingsPath = path.join(defaultsDir, 'settings', APP_SETTINGS_FILENAME)
      if (fs.existsSync(defaultAppSettingsPath)) {
        fs.mkdirSync(settingsDir, { recursive: true })
        fs.copyFileSync(defaultAppSettingsPath, appSettingsPath)
      }
    }
  }

  return { scriptsDir, settingsDir, resolveScriptPath, seed }
}
