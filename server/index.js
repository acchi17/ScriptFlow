import path from 'node:path'
import os from 'node:os'
import { fork } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import open from 'open'
import { createAppDataPaths } from '../shared/appDataPaths.js'
import RunnerHost from '../shared/RunnerHost.js'
import createApiRouter from './api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT) || 3000
const ROOT_DIR = path.resolve(__dirname, '..')
const APPDATA_DIR = path.join(ROOT_DIR, 'appdata')
const DIST_DIR = path.join(ROOT_DIR, 'dist')

const appPaths = createAppDataPaths({ rootDir: ROOT_DIR, defaultsDir: APPDATA_DIR })
appPaths.seed()

const runnerHost = new RunnerHost(() => fork(
  path.join(ROOT_DIR, 'shared', 'script-runner.js'),
  [appPaths.scriptsDir]
))

const app = express()
app.use(express.json())
app.use('/api', createApiRouter({ appPaths, runnerHost }))
app.use(express.static(DIST_DIR))

function printLanAddresses() {
  console.log(`ScriptFlow web server listening on port ${PORT}`)
  console.log(`  http://localhost:${PORT}`)
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  http://${addr.address}:${PORT}`)
      }
    }
  }
}

const server = app.listen(PORT, '0.0.0.0', () => {
  printLanAddresses()
  open(`http://localhost:${PORT}`).catch(() => {
    console.log('Could not auto-launch the browser; open one of the URLs above manually.')
  })
})

function shutdown() {
  runnerHost.shutdown().then(() => server.close(() => process.exit(0)))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
