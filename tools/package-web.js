// Assembles a double-clickable, portable Windows distribution of the Web
// server target: a folder containing a real node.exe, the server source,
// the built frontend, and production dependencies, plus a .bat launcher.
// Run `npm run web:build` first so `dist/` exists.
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'
import { execFileSync, execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(ROOT_DIR, 'out', '.cache')
const OUT_DIR = path.join(ROOT_DIR, 'out', 'ScriptFlow-Web')

const NODE_VERSION = process.env.PORTABLE_NODE_VERSION || '24.20.0'
const NODE_ARCHIVE_NAME = `node-v${NODE_VERSION}-win-x64`
const NODE_ZIP_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE_NAME}.zip`

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'))
const RUNTIME_DEPS = ['express', 'open']

function downloadFile(url, destPath, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume()
        downloadFile(res.headers.location, destPath, redirectsLeft - 1).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`))
        return
      }
      const file = fs.createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    }).on('error', reject)
  })
}

async function ensurePortableNode() {
  const extractDir = path.join(CACHE_DIR, NODE_ARCHIVE_NAME)
  const nodeExePath = path.join(extractDir, 'node.exe')
  if (fs.existsSync(nodeExePath)) return nodeExePath

  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const zipPath = path.join(CACHE_DIR, `${NODE_ARCHIVE_NAME}.zip`)
  if (!fs.existsSync(zipPath)) {
    console.log(`Downloading portable Node.js ${NODE_VERSION}...`)
    await downloadFile(NODE_ZIP_URL, zipPath)
  }

  console.log('Extracting portable Node.js...')
  execFileSync('powershell', [
    '-NoProfile', '-Command',
    `Expand-Archive -Path '${zipPath}' -DestinationPath '${CACHE_DIR}' -Force`
  ])

  if (!fs.existsSync(nodeExePath)) {
    throw new Error(`node.exe not found after extraction at ${nodeExePath}`)
  }
  return nodeExePath
}

function installProductionDeps(destNodeModulesDir) {
  const stagingDir = path.join(CACHE_DIR, 'prod-deps')
  fs.rmSync(stagingDir, { recursive: true, force: true })
  fs.mkdirSync(stagingDir, { recursive: true })

  const dependencies = {}
  for (const name of RUNTIME_DEPS) {
    dependencies[name] = rootPkg.dependencies[name]
  }
  fs.writeFileSync(
    path.join(stagingDir, 'package.json'),
    JSON.stringify({ name: 'scriptflow-web-deps', private: true, dependencies }, null, 2)
  )

  console.log('Installing production dependencies...')
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  execSync(`${npmCmd} install --omit=dev --no-audit --no-fund`, { cwd: stagingDir, stdio: 'inherit' })

  fs.cpSync(path.join(stagingDir, 'node_modules'), destNodeModulesDir, { recursive: true })
}

function writeLauncher() {
  const launcher = [
    '@echo off',
    'cd /d "%~dp0"',
    '"node\\node.exe" "server\\index.js"',
    'pause'
  ].join('\r\n')
  fs.writeFileSync(path.join(OUT_DIR, 'Start ScriptFlow.bat'), launcher)
}

async function main() {
  const distDir = path.join(ROOT_DIR, 'dist')
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error('dist/ is missing or incomplete. Run `npm run web:build` first.')
  }

  const nodeExePath = await ensurePortableNode()

  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  fs.mkdirSync(path.join(OUT_DIR, 'node'), { recursive: true })
  fs.copyFileSync(nodeExePath, path.join(OUT_DIR, 'node', 'node.exe'))

  for (const dir of ['server', 'shared', 'configs']) {
    fs.cpSync(path.join(ROOT_DIR, dir), path.join(OUT_DIR, dir), { recursive: true })
  }
  fs.cpSync(distDir, path.join(OUT_DIR, 'dist'), { recursive: true })

  fs.writeFileSync(
    path.join(OUT_DIR, 'package.json'),
    JSON.stringify({ name: 'scriptflow-web', version: rootPkg.version, private: true, type: 'module' }, null, 2)
  )

  installProductionDeps(path.join(OUT_DIR, 'node_modules'))
  writeLauncher()

  console.log(`\nDone. Distributable folder: ${OUT_DIR}`)
  console.log('Copy the whole folder to the target machine and double-click "Start ScriptFlow.bat".')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
