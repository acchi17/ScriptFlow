import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import EntryDefinitionService from '@/services/entry_definition/EntryDefinitionService.js'
import EntryPersistanceService from '@/services/entry_persistance/EntryPersistanceService.js'
import { useTabStore, MAX_TABS } from '@/stores/useTabStore.js'
import blockDefinitionsRaw from '../../../appdata/settings/BlockDefinitions.json'

let entryManager
let entryExecutionService
let platformService
let entryPersistanceService
let store

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

  const app = createApp({})
  app.provide('entryManager', entryManager)
  app.provide('entryExecutionService', entryExecutionService)
  app.provide('entryPersistanceService', entryPersistanceService)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)

  store = app.runWithContext(() => useTabStore())
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

describe('useTabStore.openRecipeInNewTab', () => {
  it('does not create a tab and returns null when the user cancels', async () => {
    const existing = store.createTab()
    const createTabSpy = vi.spyOn(store, 'createTab')

    const result = await store.openRecipeInNewTab()

    expect(result).toBeNull()
    expect(createTabSpy).not.toHaveBeenCalled()
    expect(store.tabs.map(t => t.id)).toEqual([existing.id])
    expect(store.activeTabId).toBe(existing.id)
  })

  it('restores into a new active tab without touching existing tabs and returns the report', async () => {
    const existing = store.createTab()
    const existingBlockId = addBlock(existing.rootEntryId, 'Mul', 0)
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe() })

    const report = await store.openRecipeInNewTab()

    expect(store.tabs).toHaveLength(2)
    const loaded = store.tabs[1]
    expect(store.activeTabId).toBe(loaded.id)
    expect(childNames(loaded.rootEntryId)).toEqual(['Add'])
    expect(entryManager.getChildren(existing.rootEntryId)).toEqual([existingBlockId])
    expect(report.entryCount).toBe(1)
  })

  it('labels the tab with the file name without extension, not meta.name', async () => {
    store.createTab()
    const nextTabNumber = store.nextTabNumber
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe('bar') })

    await store.openRecipeInNewTab()

    expect(store.activeTab.label).toBe('foo')
    expect(store.nextTabNumber).toBe(nextTabNumber)
  })

  it('closes the created tab and rethrows when restoring fails', async () => {
    const existing = store.createTab()
    const badRecipe = { ...buildSampleRecipe(), formatVersion: 999 }
    platformService.openRecipe.mockResolvedValue({ fileName: 'broken.json', data: badRecipe })

    await expect(store.openRecipeInNewTab()).rejects.toThrow()

    expect(store.tabs.map(t => t.id)).toEqual([existing.id])
    expect(store.activeTabId).toBe(existing.id)
  })

  it('throws and does not restore when no more tabs can be created', async () => {
    for (let i = 0; i < MAX_TABS; i++) store.createTab()
    const tabIds = store.tabs.map(t => t.id)
    platformService.openRecipe.mockResolvedValue({ fileName: 'foo.json', data: buildSampleRecipe() })
    const restoreSpy = vi.spyOn(entryPersistanceService, 'restoreRecipe')

    await expect(store.openRecipeInNewTab()).rejects.toThrow('Cannot open more tabs.')

    expect(restoreSpy).not.toHaveBeenCalled()
    expect(store.tabs.map(t => t.id)).toEqual(tabIds)
  })
})

describe('useTabStore.saveTab', () => {
  it('suggests the tab label as the file name', async () => {
    const tab = store.createTab('My recipe')

    await store.saveTab(tab.id)

    expect(platformService.saveRecipeAs).toHaveBeenCalledTimes(1)
    expect(platformService.saveRecipeAs.mock.calls[0][1]).toBe('My recipe.json')
  })

  it.each([
    ['C:\\dir\\baz.json'],
    ['/home/u/baz.json']
  ])('renames the tab after the saved full path %s', async (savedPath) => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockResolvedValue(savedPath)

    const result = await store.saveTab(tab.id)

    expect(result).toBe(savedPath)
    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('baz')
  })

  it('renames the tab after a bare file name (web)', async () => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockResolvedValue('baz.json')

    await store.saveTab(tab.id)

    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('baz')
  })

  it('keeps the label and returns null when the user cancels', async () => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockResolvedValue(null)

    const result = await store.saveTab(tab.id)

    expect(result).toBeNull()
    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('Recipe 1')
  })

  it('does nothing and returns null for an unknown tab', async () => {
    const result = await store.saveTab('no-such-tab')

    expect(result).toBeNull()
    expect(platformService.saveRecipeAs).not.toHaveBeenCalled()
  })

  it('rethrows and keeps the label when saving fails', async () => {
    const tab = store.createTab()
    platformService.saveRecipeAs.mockRejectedValue(new Error('disk full'))

    await expect(store.saveTab(tab.id)).rejects.toThrow('disk full')

    expect(store.getTabByRootId(tab.rootEntryId).label).toBe('Recipe 1')
  })
})
