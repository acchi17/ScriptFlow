import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import { DEFS_FILENAME, SCRIPT_NAME_PATTERN } from '../shared/appDataPaths.js'

/**
 * Express router exposing the HTTP equivalents of the Electron IPC channels
 * (settings/scripts/execute/sockets). Recipe read/write is intentionally not
 * exposed here — the Web client handles recipes entirely client-side via
 * browser upload/download.
 *
 * @param {Object} deps
 * @param {ReturnType<import('../shared/appDataPaths.js').createAppDataPaths>} deps.appPaths
 * @param {import('../shared/RunnerHost.js').default} deps.runnerHost
 */
export default function createApiRouter({ appPaths, runnerHost }) {
  const router = express.Router()

  router.get('/settings', (req, res) => {
    const filePath = path.join(appPaths.settingsDir, DEFS_FILENAME)
    if (!fs.existsSync(filePath)) {
      res.status(404).type('text/plain').send(`Block definitions file not found: ${filePath}`)
      return
    }
    res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')))
  })

  router.put('/settings', (req, res) => {
    const settingsDir = appPaths.settingsDir
    fs.mkdirSync(settingsDir, { recursive: true })
    const target = path.join(settingsDir, DEFS_FILENAME)
    const tmp = `${target}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(req.body, null, 2), 'utf8')
    fs.renameSync(tmp, target)
    res.status(204).end()
  })

  router.get('/scripts', (req, res) => {
    const dir = appPaths.scriptsDir
    if (!fs.existsSync(dir)) {
      res.json([])
      return
    }
    const names = fs.readdirSync(dir)
      .filter(f => f.endsWith('.mjs'))
      .map(f => f.slice(0, -4))
      .filter(name => SCRIPT_NAME_PATTERN.test(name))
    res.json(names)
  })

  router.put('/scripts/:name', express.text({ type: '*/*' }), (req, res) => {
    try {
      const filePath = appPaths.resolveScriptPath(req.params.name)
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, req.body || '', 'utf8')
      res.status(204).end()
    } catch (error) {
      res.status(400).type('text/plain').send(error.message)
    }
  })

  router.post('/scripts/:name/execute', async (req, res) => {
    try {
      const result = await runnerHost.executeScript(req.params.name, req.body || {})
      res.json(result)
    } catch (error) {
      res.status(500).type('text/plain').send(error.message)
    }
  })

  router.post('/sockets', async (req, res) => {
    const { host, port } = req.body || {}
    const socketId = await runnerHost.createSocket(host, port)
    res.json({ socketId })
  })

  router.delete('/sockets/:id', async (req, res) => {
    const destroyed = await runnerHost.destroySocket(req.params.id)
    res.json({ destroyed })
  })

  return router
}
