import { describe, it, expect, vi, afterEach } from 'vitest'
import ScriptExecutionService from '../ScriptExecutionService.js'

afterEach(() => {
  delete window.electronAPI
  vi.unstubAllGlobals()
})

describe('ScriptExecutionService.shutdownRunner', () => {
  it('calls window.electronAPI.shutdownRunner with the entryId in Electron', async () => {
    window.electronAPI = { shutdownRunner: vi.fn(async () => undefined) }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const service = new ScriptExecutionService()

    await service.shutdownRunner('root-1')

    expect(window.electronAPI.shutdownRunner).toHaveBeenCalledWith('root-1')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends DELETE /api/runners/<encoded entryId> on the Web target', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ shutdown: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    const service = new ScriptExecutionService()

    await service.shutdownRunner('root/1 a')

    expect(fetchMock).toHaveBeenCalledWith('/api/runners/root%2F1%20a', { method: 'DELETE' })
  })

  it('throws when the Web server responds with a non-2xx status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom' })))
    const service = new ScriptExecutionService()

    await expect(service.shutdownRunner('root-1')).rejects.toThrow('boom')
  })
})
