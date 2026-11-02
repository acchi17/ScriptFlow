import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useTabStore, MAX_TABS } from '@/stores/useTabStore.js'
import { useSystemState } from '@/composables/useSystemState.js'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'

let app
let entryManager
let entryExecutionService
let systemState

beforeEach(() => {
  entryManager = new EntryHandlerFacade()
  entryExecutionService = {
    createComm: vi.fn().mockResolvedValue(true),
    deleteComm: vi.fn().mockResolvedValue(false),
    shutdownRunner: vi.fn().mockResolvedValue(undefined)
  }
  app = createApp({})
  app.provide('entryManager', entryManager)
  app.provide('entryExecutionService', entryExecutionService)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)

  // useSystemState holds module-level state; start every test from a clean one.
  systemState = app.runWithContext(() => useSystemState())
  systemState.resetState()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function setSelectionAndConnection() {
  systemState.setSelection('some-entry')
  systemState.startConnection('some-entry', 'p', 'output', 'int')
}

function expectStateCleared() {
  expect(systemState.getSelectedEntryId.value).toBeNull()
  expect(systemState.getConnectingSource.value).toBeNull()
}

function expectStateKept() {
  expect(systemState.getSelectedEntryId.value).toBe('some-entry')
  expect(systemState.getConnectingSource.value).not.toBeNull()
}

describe('useTabStore.createTab', () => {
  it('labels tabs Recipe 1, Recipe 2, ... without reusing numbers after closing', async () => {
    const store = useTabStore()
    const t1 = store.createTab()
    const t2 = store.createTab()
    expect(t1.label).toBe('Recipe 1')
    expect(t2.label).toBe('Recipe 2')

    await store.closeTab(t2.id)
    const t3 = store.createTab()
    expect(t3.label).toBe('Recipe 3')
  })

  it('uses a given label without consuming the sequence number', () => {
    const store = useTabStore()
    const t1 = store.createTab('my-recipe')
    const t2 = store.createTab()
    expect(t1.label).toBe('my-recipe')
    expect(t2.label).toBe('Recipe 1')
    expect(t1.id).not.toBe(t2.id)
  })

  it('makes the created tab active, with or without existing tabs', () => {
    const store = useTabStore()
    const t1 = store.createTab()
    expect(store.activeTabId).toBe(t1.id)
    const t2 = store.createTab()
    expect(store.activeTabId).toBe(t2.id)
    expect(store.activeTab).toEqual(t2)
  })

  it('clears selection and connecting state set in the previous tab', () => {
    const store = useTabStore()
    store.createTab()
    setSelectionAndConnection()
    store.createTab()
    expectStateCleared()
  })

  it('does not create a socket and starts with commStatus none and scrollTop 0', () => {
    const store = useTabStore()
    const tab = store.createTab()
    expect(entryExecutionService.createComm).not.toHaveBeenCalled()
    expect(tab.commStatus).toBe('none')
    expect(tab.scrollTop).toBe(0)
  })

  it('creates a new root entry with the default comm setting', () => {
    const store = useTabStore()
    const tab = store.createTab()
    expect(entryManager.isRoot(tab.rootEntryId)).toBe(true)
    expect(entryManager.getComm(tab.rootEntryId)).toEqual({ useTcpIp: false, host: '127.0.0.1', port: 8080 })
    expect(tab.id).not.toBe(tab.rootEntryId)
  })

  it('returns null and changes nothing once the tab limit is reached', () => {
    const store = useTabStore()
    for (let i = 0; i < MAX_TABS; i++) store.createTab()
    expect(store.isTabLimitReached).toBe(true)

    const tabsBefore = [...store.tabs]
    const activeBefore = store.activeTabId
    const nextBefore = store.nextTabNumber

    expect(store.createTab()).toBeNull()
    expect(store.createTab('named')).toBeNull()
    expect(store.tabs).toEqual(tabsBefore)
    expect(store.activeTabId).toBe(activeBefore)
    expect(store.nextTabNumber).toBe(nextBefore)
  })
})

describe('useTabStore.closeTab', () => {
  it('calls deleteComm, shutdownRunner, then removeEntry with the same rootId', async () => {
    const store = useTabStore()
    const tab = store.createTab()
    const order = []
    entryExecutionService.deleteComm.mockImplementation(async (id) => { order.push(['deleteComm', id]) })
    entryExecutionService.shutdownRunner.mockImplementation(async (id) => { order.push(['shutdownRunner', id]) })
    const original = entryManager.removeEntry.bind(entryManager)
    vi.spyOn(entryManager, 'removeEntry').mockImplementation((id) => {
      order.push(['removeEntry', id])
      return original(id)
    })

    await store.closeTab(tab.id)

    expect(order).toEqual([
      ['deleteComm', tab.rootEntryId],
      ['shutdownRunner', tab.rootEntryId],
      ['removeEntry', tab.rootEntryId]
    ])
    expect(entryManager.isRoot(tab.rootEntryId)).toBe(false)
  })

  it('removes the entry and the tab even if deleteComm / shutdownRunner throw', async () => {
    const store = useTabStore()
    const tab = store.createTab()
    entryExecutionService.deleteComm.mockRejectedValue(new Error('socket'))
    entryExecutionService.shutdownRunner.mockRejectedValue(new Error('runner'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const removeSpy = vi.spyOn(entryManager, 'removeEntry')

    await store.closeTab(tab.id)

    expect(removeSpy).toHaveBeenCalledWith(tab.rootEntryId)
    expect(store.tabs).toHaveLength(0)
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })

  it.each([0, 1, 2])('activates tabs[0] when the active tab at index %i is closed', async (index) => {
    const store = useTabStore()
    const created = [store.createTab(), store.createTab(), store.createTab()]
    store.setActiveTab(created[index].id)

    await store.closeTab(created[index].id)

    expect(store.tabs).toHaveLength(2)
    expect(store.activeTabId).toBe(store.tabs[0].id)
  })

  it('keeps the active tab when an inactive tab is closed', async () => {
    const store = useTabStore()
    const t1 = store.createTab()
    const t2 = store.createTab()
    store.setActiveTab(t2.id)

    await store.closeTab(t1.id)

    expect(store.activeTabId).toBe(t2.id)
  })

  it('leaves no tabs and no active tab after closing the last tab', async () => {
    const store = useTabStore()
    const tab = store.createTab()

    await store.closeTab(tab.id)

    expect(store.tabs).toEqual([])
    expect(store.activeTabId).toBeNull()
    expect(store.activeTab).toBeNull()
    expect(store.visibleTabs).toEqual([])
  })

  it('does not ask for confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const store = useTabStore()
    const tab = store.createTab()
    const child = entryManager.addEntry('block', 'A')
    entryManager.moveEntry(child, tab.rootEntryId, 0)

    await store.closeTab(tab.id)

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(store.tabs).toHaveLength(0)
  })

  it('lifts the tab limit after closing a tab', async () => {
    const store = useTabStore()
    for (let i = 0; i < MAX_TABS; i++) store.createTab()
    expect(store.isTabLimitReached).toBe(true)

    await store.closeTab(store.tabs[0].id)

    expect(store.isTabLimitReached).toBe(false)
    expect(store.createTab()).not.toBeNull()
  })

  it('does nothing for an unknown tab id', async () => {
    const store = useTabStore()
    store.createTab()
    await store.closeTab('unknown')
    expect(store.tabs).toHaveLength(1)
    expect(entryExecutionService.deleteComm).not.toHaveBeenCalled()
  })
})

describe('useTabStore.setActiveTab', () => {
  it('clears selection and connecting state when switching to another tab', () => {
    const store = useTabStore()
    const t1 = store.createTab()
    store.createTab()
    setSelectionAndConnection()

    store.setActiveTab(t1.id)

    expect(store.activeTabId).toBe(t1.id)
    expectStateCleared()
  })

  it('keeps selection and connecting state when the same tab is given', () => {
    const store = useTabStore()
    const t1 = store.createTab()
    setSelectionAndConnection()

    store.setActiveTab(t1.id)

    expectStateKept()
  })

  it('accepts null', () => {
    const store = useTabStore()
    store.createTab()
    setSelectionAndConnection()

    store.setActiveTab(null)

    expect(store.activeTabId).toBeNull()
    expect(store.activeTab).toBeNull()
    expectStateCleared()
  })
})

describe('useTabStore.getTabByRootId / setCommStatus', () => {
  it('updates only the matching tab', () => {
    const store = useTabStore()
    const t1 = store.createTab()
    const t2 = store.createTab()

    expect(store.getTabByRootId(t1.rootEntryId).id).toBe(t1.id)
    store.setCommStatus(t1.rootEntryId, 'connected')

    expect(store.getTabByRootId(t1.rootEntryId).commStatus).toBe('connected')
    expect(store.getTabByRootId(t2.rootEntryId).commStatus).toBe('none')
  })

  it('does nothing for an unknown rootId', () => {
    const store = useTabStore()
    store.createTab()
    expect(store.getTabByRootId('unknown')).toBeNull()
    store.setCommStatus('unknown', 'failed')
    expect(store.tabs[0].commStatus).toBe('none')
  })
})

describe('useTabStore.setTabLabel', () => {
  it('updates only the matching tab', () => {
    const store = useTabStore()
    const t1 = store.createTab()
    const t2 = store.createTab()
    store.setTabLabel(t2.rootEntryId, 'saved')
    expect(store.getTabByRootId(t1.rootEntryId).label).toBe('Recipe 1')
    expect(store.getTabByRootId(t2.rootEntryId).label).toBe('saved')
  })

  it('does nothing for an unknown rootId', () => {
    const store = useTabStore()
    store.createTab()
    store.setTabLabel('unknown', 'x')
    expect(store.tabs[0].label).toBe('Recipe 1')
  })
})

describe('useTabStore.setScrollTop', () => {
  it('updates only the matching tab', () => {
    const store = useTabStore()
    const t1 = store.createTab()
    const t2 = store.createTab()
    store.setScrollTop(t1.rootEntryId, 120)
    expect(store.getTabByRootId(t1.rootEntryId).scrollTop).toBe(120)
    expect(store.getTabByRootId(t2.rootEntryId).scrollTop).toBe(0)
  })

  it('does nothing for an unknown rootId', () => {
    const store = useTabStore()
    store.createTab()
    store.setScrollTop('unknown', 50)
    expect(store.tabs[0].scrollTop).toBe(0)
  })
})

describe('useTabStore.visibleTabs', () => {
  it('is [activeTab] when there is an active tab and [] otherwise', () => {
    const store = useTabStore()
    expect(store.visibleTabs).toEqual([])
    const tab = store.createTab()
    expect(store.visibleTabs).toEqual([tab])
    store.setActiveTab(null)
    expect(store.visibleTabs).toEqual([])
  })
})
