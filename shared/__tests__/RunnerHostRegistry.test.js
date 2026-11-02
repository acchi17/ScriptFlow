// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import RunnerHostRegistry from '../RunnerHostRegistry.js'

function buildRegistry() {
  const createHostFn = vi.fn(() => ({ shutdown: vi.fn(async () => {}) }))
  return { registry: new RunnerHostRegistry(createHostFn), createHostFn }
}

describe('RunnerHostRegistry.shutdown', () => {
  it('shuts down only the host of the given entryId and keeps the others', async () => {
    const { registry, createHostFn } = buildRegistry()
    const hostA = registry.get('a')
    const hostB = registry.get('b')

    await registry.shutdown('a')

    expect(hostA.shutdown).toHaveBeenCalledTimes(1)
    expect(hostB.shutdown).not.toHaveBeenCalled()
    expect(registry.get('b')).toBe(hostB)
    expect(createHostFn).toHaveBeenCalledTimes(2)
  })

  it('resolves without creating or shutting down a host for an unknown entryId', async () => {
    const { registry, createHostFn } = buildRegistry()
    const hostA = registry.get('a')
    createHostFn.mockClear()

    await expect(registry.shutdown('unknown')).resolves.toBeUndefined()

    expect(createHostFn).not.toHaveBeenCalled()
    expect(hostA.shutdown).not.toHaveBeenCalled()
  })

  it('is harmless when called twice for the same entryId', async () => {
    const { registry, createHostFn } = buildRegistry()
    const hostA = registry.get('a')

    await registry.shutdown('a')
    await expect(registry.shutdown('a')).resolves.toBeUndefined()

    expect(hostA.shutdown).toHaveBeenCalledTimes(1)
    expect(createHostFn).toHaveBeenCalledTimes(1)
  })
})
