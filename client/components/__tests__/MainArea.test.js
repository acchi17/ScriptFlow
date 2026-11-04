import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MainArea from '@/components/MainArea.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import { useTabStore, MAX_TABS } from '@/stores/useTabStore.js'

const RecipeItemStub = {
  name: 'RecipeItem',
  props: { entryId: { type: String, required: true } },
  template: '<div class="recipe-item-stub" />'
}

function mountMainArea() {
  const entryManager = new EntryHandlerFacade()
  const pinia = createPinia()
  const wrapper = mount(MainArea, {
    global: {
      plugins: [pinia],
      provide: {
        entryManager,
        entryExecutionService: {
          createComm: vi.fn(),
          deleteComm: vi.fn().mockResolvedValue(false),
          shutdownRunner: vi.fn().mockResolvedValue(undefined)
        }
      },
      stubs: {
        RecipeItem: RecipeItemStub,
        ExecutionLogView: true
      }
    }
  })
  return { wrapper, entryManager, store: useTabStore(pinia) }
}

function addChild(entryManager, rootId) {
  const childId = entryManager.addEntry('container', 'Container')
  entryManager.moveEntry(childId, rootId, 0)
  return childId
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MainArea startup', () => {
  it('creates one active tab and renders a single RecipeItem for its root', () => {
    const { wrapper, entryManager, store } = mountMainArea()

    expect(store.tabs).toHaveLength(1)
    const tab = store.tabs[0]
    expect(store.activeTabId).toBe(tab.id)
    expect(entryManager.isRoot(tab.rootEntryId)).toBe(true)

    const items = wrapper.findAllComponents(RecipeItemStub)
    expect(items).toHaveLength(1)
    expect(items[0].props('entryId')).toBe(tab.rootEntryId)
  })
})

describe('MainArea tab bar', () => {
  it('renders one tab per store tab with its label and marks the active one', async () => {
    const { wrapper, store } = mountMainArea()
    store.createTab()
    store.createTab()
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('.tab-bar .tab')
    expect(tabs).toHaveLength(3)
    expect(tabs.map(t => t.find('.tab-label').text())).toEqual(['Recipe 1', 'Recipe 2', 'Recipe 3'])
    tabs.forEach(t => expect(t.find('.tab-close-btn').exists()).toBe(true))
    expect(tabs.map(t => t.classes('active'))).toEqual([false, false, true])
  })

  it('activates a tab when it is clicked', async () => {
    const { wrapper, store } = mountMainArea()
    store.createTab()
    await wrapper.vm.$nextTick()

    await wrapper.findAll('.tab-bar .tab')[0].trigger('click')

    expect(store.activeTabId).toBe(store.tabs[0].id)
    expect(wrapper.findAll('.tab-bar .tab')[0].classes('active')).toBe(true)
    const items = wrapper.findAllComponents(RecipeItemStub)
    expect(items).toHaveLength(1)
    expect(items[0].props('entryId')).toBe(store.tabs[0].rootEntryId)
  })

  it('adds a new active tab with the + button, placed after the last tab', async () => {
    const { wrapper, store } = mountMainArea()

    await wrapper.find('.tab-add-btn').trigger('click')

    expect(store.tabs).toHaveLength(2)
    expect(store.activeTabId).toBe(store.tabs[1].id)
    const children = wrapper.find('.tab-bar').element.children
    expect(children[children.length - 1].classList.contains('tab-add-btn')).toBe(true)
    expect(wrapper.findAll('.tab-bar .tab')[1].classes('active')).toBe(true)
  })

  it('shows the empty state and only the + button when there are no tabs', async () => {
    const { wrapper, store } = mountMainArea()
    expect(wrapper.find('.tab-empty-state').exists()).toBe(false)

    await store.closeTab(store.tabs[0].id)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAllComponents(RecipeItemStub)).toHaveLength(0)
    expect(wrapper.find('.tab-empty-state').exists()).toBe(true)
    expect(wrapper.find('.tab-empty-state').text()).not.toBe('')
    expect(wrapper.findAll('.tab-bar .tab')).toHaveLength(0)
    expect(wrapper.find('.tab-add-btn').exists()).toBe(true)
  })
})

describe('MainArea close button', () => {
  it('closes an empty tab without asking for confirmation', async () => {
    const { wrapper, store } = mountMainArea()
    const confirmSpy = vi.spyOn(window, 'confirm')
    const closeSpy = vi.spyOn(store, 'closeTab')
    const tabId = store.tabs[0].id

    await wrapper.find('.tab-close-btn').trigger('click')
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(closeSpy).toHaveBeenCalledWith(tabId)
    expect(store.tabs).toHaveLength(0)
  })

  it('asks for confirmation for a tab with entries and closes it on OK', async () => {
    const { wrapper, store, entryManager } = mountMainArea()
    addChild(entryManager, store.tabs[0].rootEntryId)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const closeSpy = vi.spyOn(store, 'closeTab')
    const tabId = store.tabs[0].id

    await wrapper.find('.tab-close-btn').trigger('click')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(closeSpy).toHaveBeenCalledWith(tabId)
    expect(store.tabs).toHaveLength(0)
  })

  it('keeps a tab with entries when the confirmation is canceled', async () => {
    const { wrapper, store, entryManager } = mountMainArea()
    addChild(entryManager, store.tabs[0].rootEntryId)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const closeSpy = vi.spyOn(store, 'closeTab')

    await wrapper.find('.tab-close-btn').trigger('click')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(closeSpy).not.toHaveBeenCalled()
    expect(store.tabs).toHaveLength(1)
  })

  it('does not activate the tab whose x button is clicked', async () => {
    const { wrapper, store, entryManager } = mountMainArea()
    store.createTab()
    await wrapper.vm.$nextTick()
    const activeId = store.activeTabId
    addChild(entryManager, store.tabs[0].rootEntryId)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const setActiveSpy = vi.spyOn(store, 'setActiveTab')

    await wrapper.findAll('.tab-bar .tab')[0].find('.tab-close-btn').trigger('click')
    await flushPromises()

    expect(setActiveSpy).not.toHaveBeenCalled()
    expect(store.activeTabId).toBe(activeId)
  })
})

describe('MainArea add button limit', () => {
  it(`disables the + button when there are ${MAX_TABS} tabs`, async () => {
    const { wrapper, store } = mountMainArea()
    while (store.tabs.length < MAX_TABS) store.createTab()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.tab-add-btn').attributes('disabled')).toBeDefined()
  })

  it(`enables the + button with fewer than ${MAX_TABS} tabs, including zero`, async () => {
    const { wrapper, store } = mountMainArea()
    while (store.tabs.length < MAX_TABS - 1) store.createTab()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tab-add-btn').attributes('disabled')).toBeUndefined()

    for (const tab of [...store.tabs]) await store.closeTab(tab.id)
    await wrapper.vm.$nextTick()
    expect(store.tabs).toHaveLength(0)
    expect(wrapper.find('.tab-add-btn').attributes('disabled')).toBeUndefined()
  })

  it(`re-enables the + button after closing one of ${MAX_TABS} tabs`, async () => {
    const { wrapper, store } = mountMainArea()
    while (store.tabs.length < MAX_TABS) store.createTab()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tab-add-btn').attributes('disabled')).toBeDefined()

    await wrapper.findAll('.tab-bar .tab')[3].find('.tab-close-btn').trigger('click')
    await flushPromises()

    expect(store.tabs).toHaveLength(MAX_TABS - 1)
    expect(wrapper.find('.tab-add-btn').attributes('disabled')).toBeUndefined()
  })
})
