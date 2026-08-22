import { describe, it, expect, vi } from 'vitest'
import PlainContainerExecutionStrategy from '../PlainContainerExecutionStrategy.js'

function buildEntryManager(children) {
  return { getChildren: () => children }
}

describe('PlainContainerExecutionStrategy.execute', () => {
  it('runs all children sequentially in order', async () => {
    const entryManager = buildEntryManager(['a', 'b', 'c'])
    const strategy = new PlainContainerExecutionStrategy(entryManager)
    const runChild = vi.fn(async () => ({ success: true }))

    await strategy.execute('container', runChild)

    expect(runChild.mock.calls.map(call => call[0])).toEqual(['a', 'b', 'c'])
  })

  it('reports success only when every child succeeds', async () => {
    const entryManager = buildEntryManager(['a', 'b'])
    const strategy = new PlainContainerExecutionStrategy(entryManager)
    const runChild = vi.fn(async (id) => ({ success: id !== 'b' }))

    const result = await strategy.execute('container', runChild)

    expect(result).toEqual({ success: false })
  })

  it('reports success for an empty container', async () => {
    const entryManager = buildEntryManager([])
    const strategy = new PlainContainerExecutionStrategy(entryManager)

    const result = await strategy.execute('container', vi.fn())

    expect(result).toEqual({ success: true })
  })
})
