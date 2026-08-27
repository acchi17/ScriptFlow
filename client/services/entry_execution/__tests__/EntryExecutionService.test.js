import { describe, it, expect, vi } from 'vitest'
import EntryManager from '../../../managers/EntryManager.js'
import EntryExecutionService from '../EntryExecutionService.js'

function buildEntryDefinitionService() {
  return {
    getBlockDefinition: (name) => ({ command: name }),
    getBlockParamDef: (name) => name === 'BoolBlock'
      ? { input: {}, output: { Flag: { value: false, dataType: 'boolean' } } }
      : { input: {}, output: {} },
    getContainerParamDef: (name) => name === 'if-container'
      ? { input: { Execute: { value: true, dataType: 'boolean' } }, output: {} }
      : { input: {}, output: {} }
  }
}

function buildService(entryManager) {
  const service = new EntryExecutionService({ script: {} }, entryManager)
  service.scriptExecutionService.executeScript = vi.fn(async () => ({ success: true }))
  return service
}

describe('EntryExecutionService container execution', () => {
  it('skips an if-container\'s children when its Execute input is resolved to false via a wired connection', async () => {
    const entryManager = new EntryManager(undefined, buildEntryDefinitionService())
    const sourceBlockId = entryManager.addEntry('block', 'BoolBlock')
    entryManager.setOutputParam(sourceBlockId, 'Flag', false)

    const ifContainerId = entryManager.addEntry('container', 'if-container')
    const childBlockId = entryManager.addEntry('block', 'ChildBlock')
    entryManager.moveEntry(childBlockId, ifContainerId, 0)

    entryManager.addConnection(
      { entryId: sourceBlockId, category: 'output', dataType: 'boolean', paramName: 'Flag' },
      { entryId: ifContainerId, category: 'input', dataType: 'boolean', paramName: 'Execute' }
    )

    const service = buildService(entryManager)

    const result = await service.executeEntry(ifContainerId)

    expect(service.scriptExecutionService.executeScript).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('runs an if-container\'s children when Execute resolves to true, and a plain container always runs its children', async () => {
    const entryManager = new EntryManager(undefined, buildEntryDefinitionService())

    const ifContainerId = entryManager.addEntry('container', 'if-container')
    const ifChildId = entryManager.addEntry('block', 'ChildBlock')
    entryManager.moveEntry(ifChildId, ifContainerId, 0)

    const plainContainerId = entryManager.addEntry('container', 'Container')
    const plainChildId = entryManager.addEntry('block', 'ChildBlock')
    entryManager.moveEntry(plainChildId, plainContainerId, 0)

    const service = buildService(entryManager)

    const ifResult = await service.executeEntry(ifContainerId)
    const plainResult = await service.executeEntry(plainContainerId)

    expect(ifResult).toEqual({ success: true })
    expect(plainResult).toEqual({ success: true })
    expect(service.scriptExecutionService.executeScript).toHaveBeenCalledTimes(2)
  })
})
