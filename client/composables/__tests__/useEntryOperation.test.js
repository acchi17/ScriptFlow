import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { useEntryOperation } from '@/composables/useEntryOperation.js'

let app
let operation

beforeEach(() => {
  app = createApp({})
  app.provide('entryManager', {})
  operation = app.runWithContext(() => useEntryOperation())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useEntryOperation.execute', () => {
  it('holds isExecuting while the function runs and returns its result', async () => {
    let executingDuringCall = null
    const fn = vi.fn(async (a, b) => {
      executingDuringCall = operation.isExecuting.value
      return a + b
    })

    const result = await operation.execute(fn, 1, 2)

    expect(fn).toHaveBeenCalledWith(1, 2)
    expect(result).toBe(3)
    expect(executingDuringCall).toBe(true)
    expect(operation.isExecuting.value).toBe(false)
  })

  it('releases isExecuting and rethrows when the function throws', async () => {
    await expect(operation.execute(async () => { throw new Error('boom') })).rejects.toThrow('boom')

    expect(operation.isExecuting.value).toBe(false)
  })

  it('shares isExecuting between callers', async () => {
    const other = app.runWithContext(() => useEntryOperation())
    let otherDuringCall = null

    await operation.execute(async () => { otherDuringCall = other.isExecuting.value })

    expect(otherDuringCall).toBe(true)
  })
})
