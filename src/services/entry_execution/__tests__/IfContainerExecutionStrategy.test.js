import { describe, it, expect, vi } from 'vitest'
import IfContainerExecutionStrategy from '../IfContainerExecutionStrategy.js'

function buildEntryManager(children) {
  return { hierarchyHandler: { getChildren: () => children } }
}

describe('IfContainerExecutionStrategy.execute', () => {
  it('runs all children in order when Execute is true', async () => {
    const entryManager = buildEntryManager(['a', 'b'])
    const strategy = new IfContainerExecutionStrategy(entryManager)
    const runChild = vi.fn(async () => ({ success: true }))

    const result = await strategy.execute('container', runChild, { Execute: true })

    expect(runChild.mock.calls.map(call => call[0])).toEqual(['a', 'b'])
    expect(result).toEqual({ success: true })
  })

  it('runs all children when Execute is absent from inputParams (fail-open default)', async () => {
    const entryManager = buildEntryManager(['a'])
    const strategy = new IfContainerExecutionStrategy(entryManager)
    const runChild = vi.fn(async () => ({ success: true }))

    const result = await strategy.execute('container', runChild, {})

    expect(runChild).toHaveBeenCalledWith('a')
    expect(result).toEqual({ success: true })
  })

  it('skips all children and reports success when Execute is explicitly false', async () => {
    const entryManager = buildEntryManager(['a', 'b'])
    const strategy = new IfContainerExecutionStrategy(entryManager)
    const runChild = vi.fn(async () => ({ success: true }))

    const result = await strategy.execute('container', runChild, { Execute: false })

    expect(runChild).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('reports failure when any child fails while running', async () => {
    const entryManager = buildEntryManager(['a', 'b'])
    const strategy = new IfContainerExecutionStrategy(entryManager)
    const runChild = vi.fn(async (id) => ({ success: id !== 'b' }))

    const result = await strategy.execute('container', runChild, { Execute: true })

    expect(result).toEqual({ success: false })
  })
})
