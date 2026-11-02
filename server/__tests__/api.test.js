// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import express from 'express'
import createApiRouter from '../api.js'
import RunnerHostRegistry from '../../shared/RunnerHostRegistry.js'

const appPaths = { settingsDir: '/nonexistent', scriptsDir: '/nonexistent', resolveScriptPath: () => '/nonexistent' }

let server = null

async function startServer(runnerRegistry) {
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter({ appPaths, runnerRegistry }))
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve) })
  return `http://127.0.0.1:${server.address().port}`
}

afterEach(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve))
    server = null
  }
})

describe('DELETE /api/runners/:entryId', () => {
  it('shuts down the runner of the given entryId and returns { shutdown: true }', async () => {
    const runnerRegistry = { shutdown: vi.fn(async () => {}), get: vi.fn() }
    const baseUrl = await startServer(runnerRegistry)

    const response = await fetch(`${baseUrl}/api/runners/${encodeURIComponent('entry 1')}`, { method: 'DELETE' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ shutdown: true })
    expect(runnerRegistry.shutdown).toHaveBeenCalledWith('entry 1')
  })

  it('does not go through runnerRegistry.get()', async () => {
    const runnerRegistry = { shutdown: vi.fn(async () => {}), get: vi.fn() }
    const baseUrl = await startServer(runnerRegistry)

    await fetch(`${baseUrl}/api/runners/a`, { method: 'DELETE' })

    expect(runnerRegistry.get).not.toHaveBeenCalled()
  })

  it('succeeds for an unknown entryId without creating a host', async () => {
    const createHostFn = vi.fn(() => ({ shutdown: vi.fn(async () => {}) }))
    const runnerRegistry = new RunnerHostRegistry(createHostFn)
    const baseUrl = await startServer(runnerRegistry)

    const response = await fetch(`${baseUrl}/api/runners/unknown`, { method: 'DELETE' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ shutdown: true })
    expect(createHostFn).not.toHaveBeenCalled()
  })
})
