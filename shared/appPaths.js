import path from 'node:path'
import fs from 'node:fs'

export const SCRIPT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/
export const DEFS_FILENAME = 'BlockDefinitions.json'

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
export function createAppPaths({ rootDir, defaultsDir }) {
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
  }

  return { scriptsDir, settingsDir, resolveScriptPath, seed }
}
