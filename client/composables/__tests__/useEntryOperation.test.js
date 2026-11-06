import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import EntryDefinitionService from '@/services/entry_definition/EntryDefinitionService.js'
import EntryPersistanceService from '@/services/entry_persistance/EntryPersistanceService.js'
import { useEntryOperation } from '@/composables/useEntryOperation.js'
import { useSystemState } from '@/composables/useSystemState.js'
import { useTabStore, MAX_TABS } from '@/stores/useTabStore.js'
import blockDefinitionsRaw from '../../../appdata/settings/BlockDefinitions.json'

let entryManager
let entryExecutionService
let platformService
let entryPersistanceService
let app
let store
let systemState
let operation

beforeEach(async () => {
  const entryDefinitionService = new EntryDefinitionService({
    readBlockDefinitions: async () => blockDefinitionsRaw
  })
  await entryDefinitionService.loadBlockDefinitions()

  entryManager = new EntryHandlerFacade(undefined, entryDefinitionService)
  entryExecutionService = {
    createComm: vi.fn().mockResolvedValue(true),
    deleteComm: vi.fn().mockResolvedValue(false),
    shutdownRunner: vi.fn().mockResolvedValue(undefined)
  }
  platformService = {
    openRecipe: vi.fn().mockResolvedValue(null),
    saveRecipeAs: vi.fn().mockResolvedValue(null)
  }
  entryPersistanceService = new EntryPersistanceService(
    platformService, entryManager, entryExecutionService, entryDefinitionService
  )

  app = createApp({})
  app.provide('entryManager', entryManager)
  app.provide('entryExecutionService', entryExecutionService)
  app.provide('entryPersistanceService', entryPersistanceService)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)

  store = app.runWithContext(() => useTabStore())
  systemState = app.runWithContext(() => useSystemState())
  // useSystemState holds module-level state; start every test from a clean one.
  systemState.clearError()
  operation = app.runWithContext(() => useEntryOperation())
})

afterEach(() => {
  vi.restoreAllMocks()
})

function addBlock(parentId, name, index) {
  const blockId = entryManager.addEntry('block', name)
  entryManager.moveEntry(blockId, parentId, index)
  return blockId
}

// Builds a recipe containing one 'Add' block from a temporary root, then removes that root.
function buildSampleRecipe(metaName) {
  const tmpRootId = entryManager.addEntry('container', 'root-container')
  entryManager.moveEntry(tmpRootId, null, 0)
  addBlock(tmpRootId, 'Add', 0)
  const recipe = entryPersistanceService.buildRecipe(tmpRootId)
  entryManager.removeEntry(tmpRootId)
  if (metaName !== undefined) recipe.meta = { ...(recipe.meta ?? {}), name: metaName }
  return recipe
}

function childNames(rootId) {
  return entryManager.getChildren(rootId).map(id => entryManager.getEntryName(id))
}

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

describe('useEntryOperation.loadRecipe', () => {
  it('does not create a tab and returns false when the user cancels', async () => {
    const existing = store.createTab()
    const createTabSpy = vi.spyOn(store, 'createTab')

    const result = await operation.loadRecipe()

    expect(result).toBe(false)
    expect(createTabSpy).not.toHaveBeenCalled()
    expect(store.tabs.map(t => t.id)).toEqual([existing.id])
    expect(store.activeTabId).toBe(existing.id)
  })

  it('restores into a new active tab without touching existing tabs', async () => {
    const existing = store.createTab()
    const existingBlockId = addBlock(existing.rootEntryId, 'Mul', 0)
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe() })

    const result = await operation.loadRecipe()

    expect(result).toBe(true)
    expect(store.tabs).toHaveLength(2)
    const loaded = store.tabs[1]
    expect(store.activeTabId).toBe(loaded.id)
    expect(childNames(loaded.rootEntryId)).toEqual(['Add'])
    expect(entryManager.getChildren(existing.rootEntryId)).toEqual([existingBlockId])
    expect(operation.lastReport.value.entryCount).toBe(1)
  })

  it('labels the tab with the file name without extension, not meta.name', async () => {
    store.createTab()
    const nextTabNumber = store.nextTabNumber
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe('bar') })

    await operation.loadRecipe()

    expect(store.activeTab.label).toBe('foo')
    expect(store.nextTabNumber).toBe(nextTabNumber)
  })

  it('closes the created tab and sets lastError when restoring fails', async () => {
    const existing = store.createTab()
    const badRecipe = { ...buildSampleRecipe(), formatVersion: 999 }
    platformService.openRecipe.mockResolvedValue({ fileName: 'broken.json', data: badRecipe })
    const closeTabSpy = vi.spyOn(store, 'closeTab')

    const result = await operation.loadRecipe()

    expect(result).toBe(false)
    expect(closeTabSpy).toHaveBeenCalledTimes(1)
    expect(store.tabs.map(t => t.id)).toEqual([existing.id])
    expect(systemState.lastError.value).toBeTruthy()
  })

  it('sets lastError and does not restore when no more tabs can be created', async () => {
    for (let i = 0; i < MAX_TABS; i++) store.createTab()
    const tabIds = store.tabs.map(t => t.id)
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe() })
    const restoreSpy = vi.spyOn(entryPersistanceService, 'restoreRecipe')

    const result = await operation.loadRecipe()

    expect(result).toBe(false)
    expect(systemState.lastError.value).toBeTruthy()
    expect(restoreSpy).not.toHaveBeenCalled()
    expect(store.tabs.map(t => t.id)).toEqual(tabIds)
  })

  it('releases the execution lock when done', async () => {
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe() })
    let executingDuringPick = null
    const pick = platformService.openRecipe.getMockImplementation()
    platformService.openRecipe.mockImplementation(async () => {
      executingDuringPick = operation.isExecuting.value
      return pick()
    })

    await operation.loadRecipe()

    expect(executingDuringPick).toBe(true)
    expect(operation.isExecuting.value).toBe(false)
  })
})

describe('useEntryOperation.saveRecipe', () => {
  it('suggests the tab label as the file name', async () => {
    const tab = store.createTab('My recipe')

    await operation.saveRecipe(tab.rootEntryId)

    expect(platformService.saveRecipeAs).toHaveBeenCalledTimes(1)
    expect(platformService.saveRecipeAs.mock.calls[0][1]).toBe('My recipe.json')
  })

  it.each([
    ['C:\\dir\\baz.json'],
    ['/home/u/baz.json']
  ])('renames the tab after the saved full path %s', async (savedPath) => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockResolvedValue(savedPath)

    await operation.saveRecipe(tab.rootEntryId)

    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('baz')
  })

  it('renames the tab after a bare file name (web)', async () => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockResolvedValue('baz.json')

    await operation.saveRecipe(tab.rootEntryId)

    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('baz')
  })

  it('keeps the label when the user cancels', async () => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockResolvedValue(null)

    await operation.saveRecipe(tab.rootEntryId)

    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('Recipe 1')
  })

  it('sets lastError when saving fails', async () => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockRejectedValue(new Error('disk full'))

    await operation.saveRecipe(tab.rootEntryId)

    expect(systemState.lastError.value).toBe('disk full')
    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('Recipe 1')
    expect(operation.isExecuting.value).toBe(false)
  })
})
