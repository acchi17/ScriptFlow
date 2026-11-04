import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MenuArea from '@/components/MenuArea.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import { useTabStore, MAX_TABS } from '@/stores/useTabStore.js'
import { useSystemState } from '@/composables/useSystemState.js'

let entryManager
let entryExecutionService
let entryPersistanceService
let pinia
let store

beforeEach(() => {
  entryManager = new EntryHandlerFacade()
  entryExecutionService = {
    createComm: vi.fn(),
    deleteComm: vi.fn().mockResolvedValue(false),
    shutdownRunner: vi.fn().mockResolvedValue(undefined)
  }
  entryPersistanceService = {
    saveRecipe: vi.fn().mockResolvedValue('recipe.json'),
    pickRecipe: vi.fn().mockResolvedValue(null),
    restoreRecipe: vi.fn().mockResolvedValue({ entryCount: 0, connectionCount: 0, warnings: [] })
  }
  const app = createApp({})
  app.provide('entryManager', entryManager)
  app.provide('entryExecutionService', entryExecutionService)
  pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  store = useTabStore()

  // useSystemState holds module-level state; start every test from a clean one.
  const systemState = app.runWithContext(() => useSystemState())
  systemState.setExecuting(false)
  systemState.clearError()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mountMenuArea() {
  return mount(MenuArea, {
    global: {
      plugins: [pinia],
      provide: {
        entryManager,
        entryExecutionService,
        entryPersistanceService
      }
    }
  })
}

describe('MenuArea Save button', () => {
  it('is disabled when there is no active tab', () => {
    const wrapper = mountMenuArea()

    expect(store.activeTab).toBeNull()
    expect(wrapper.find('.menu-save-btn').attributes('disabled')).toBeDefined()
  })

  it('saves the root of the active tab', async () => {
    const tab = store.createTab()
    const wrapper = mountMenuArea()
    expect(wrapper.find('.menu-save-btn').attributes('disabled')).toBeUndefined()

    await wrapper.find('.menu-save-btn').trigger('click')
    await flushPromises()

    expect(entryPersistanceService.saveRecipe).toHaveBeenCalledTimes(1)
    expect(entryPersistanceService.saveRecipe.mock.calls[0][0]).toBe(tab.rootEntryId)
  })

  it('saves the second tab when it is the active one', async () => {
    const t1 = store.createTab()
    const t2 = store.createTab()
    store.setActiveTab(t1.id)
    store.setActiveTab(t2.id)
    const wrapper = mountMenuArea()

    await wrapper.find('.menu-save-btn').trigger('click')
    await flushPromises()

    expect(entryPersistanceService.saveRecipe.mock.calls[0][0]).toBe(t2.rootEntryId)
    expect(entryPersistanceService.saveRecipe.mock.calls[0][0]).not.toBe(t1.rootEntryId)
  })
})

describe('MenuArea Load button', () => {
  it('is disabled when there are 10 tabs', () => {
    for (let i = 0; i < MAX_TABS; i++) store.createTab()
    const wrapper = mountMenuArea()

    expect(wrapper.find('.menu-load-btn').attributes('disabled')).toBeDefined()
  })

  it.each([0, 1, MAX_TABS - 1])('is enabled with %i tabs', (count) => {
    for (let i = 0; i < count; i++) store.createTab()
    const wrapper = mountMenuArea()

    expect(wrapper.find('.menu-load-btn').attributes('disabled')).toBeUndefined()
  })

  it('loads into a new tab without asking for confirmation', async () => {
    const tab = store.createTab()
    const blockId = entryManager.addEntry('container', 'Sub')
    entryManager.moveEntry(blockId, tab.rootEntryId, 0)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    entryPersistanceService.pickRecipe.mockResolvedValue({ fileName: 'foo.json', data: {} })
    const wrapper = mountMenuArea()

    await wrapper.find('.menu-load-btn').trigger('click')
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(store.tabs).toHaveLength(2)
    expect(store.activeTab.label).toBe('foo')
    expect(entryPersistanceService.restoreRecipe).toHaveBeenCalledWith({}, store.activeTab.rootEntryId)
    expect(entryManager.getChildren(tab.rootEntryId)).toEqual([blockId])
  })
})
