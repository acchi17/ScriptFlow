import { describe, it, expect, vi } from 'vitest'
import { createApp } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RecipeItem from '@/components/RecipeItem.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import { useTabStore } from '@/stores/useTabStore.js'

const CommSettingViewStub = {
  name: 'CommSettingView',
  props: { entryId: { type: String, required: true } },
  emits: ['close'],
  template: '<div class="comm-setting-view-stub" />'
}

const ConnectionViewStub = {
  name: 'ConnectionView',
  props: { rootId: { type: String, required: true } },
  template: '<svg class="connection-view-stub" />'
}

function createRoot(entryManager) {
  const rootId = entryManager.addEntry('container', 'root-container')
  entryManager.moveEntry(rootId, null, 0)
  return rootId
}

// Creates a Pinia whose stores inject the given services, so that tabs can be
// created through the store before mounting.
function createTestPinia(entryManager, entryExecutionService = {}) {
  const app = createApp({})
  app.provide('entryManager', entryManager)
  app.provide('entryExecutionService', entryExecutionService)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  return pinia
}

function mountRecipe(entryManager, entryId, pinia = createTestPinia(entryManager)) {
  return mount(RecipeItem, {
    props: { entryId },
    global: {
      plugins: [pinia],
      provide: {
        entryManager,
        entryExecutionService: {},
        entryPersistanceService: {}
      },
      stubs: {
        ConnectionView: ConnectionViewStub,
        ContainerChildren: true,
        CommSettingView: CommSettingViewStub
      }
    }
  })
}

describe('RecipeItem layouts', () => {
  it('passes its entryId to ConnectionView as root-id', () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = createRoot(entryManager)

    const wrapper = mountRecipe(entryManager, rootId)

    expect(wrapper.findComponent(ConnectionViewStub).props('rootId')).toBe(rootId)
  })

  it('calls clearEntries with its entryId when the Clear button is clicked', async () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = createRoot(entryManager)
    const spy = vi.spyOn(entryManager, 'clearEntries')

    const wrapper = mountRecipe(entryManager, rootId)
    await wrapper.find('.recipe-clear-btn').trigger('click')

    expect(spy).toHaveBeenCalledWith(rootId)
  })

  it("draws background lines only for its own root's layouts", async () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = createRoot(entryManager)
    const rootBId = createRoot(entryManager)
    const blockA = entryManager.addEntry('block', 'A')
    entryManager.moveEntry(blockA, rootAId, 0)
    const blockB = entryManager.addEntry('block', 'B')
    entryManager.moveEntry(blockB, rootBId, 0)

    const wrapper = mountRecipe(entryManager, rootAId)
    entryManager.addLayout(blockA, 10, 20)
    entryManager.addLayout(blockB, 50, 20)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.background-line')).toHaveLength(1)
  })
})

describe('RecipeItem comm status', () => {
  function setup() {
    const entryManager = new EntryHandlerFacade()
    const pinia = createTestPinia(entryManager)
    const store = useTabStore()
    const tab = store.createTab()
    const other = store.createTab()
    return { entryManager, pinia, store, tab, other }
  }

  async function closeCommSetting(wrapper, connected) {
    await wrapper.find('.recipe-com-btn').trigger('click')
    wrapper.findComponent(CommSettingViewStub).vm.$emit('close', connected)
    await wrapper.vm.$nextTick()
  }

  it.each([
    [true, 'connected', 'recipe-com-btn--connected'],
    [false, 'failed', 'recipe-com-btn--failed'],
    [undefined, 'none', null]
  ])('closing the dialog with %s sets the tab commStatus to %s', async (connected, status, cls) => {
    const { entryManager, pinia, store, tab, other } = setup()
    // Start from a status that differs from every expected one ('none' is checked too).
    store.setCommStatus(tab.rootEntryId, status === 'failed' ? 'connected' : 'failed')
    const wrapper = mountRecipe(entryManager, tab.rootEntryId, pinia)

    await closeCommSetting(wrapper, connected)

    expect(store.getTabByRootId(tab.rootEntryId).commStatus).toBe(status)
    expect(store.getTabByRootId(other.rootEntryId).commStatus).toBe('none')
    const btn = wrapper.find('.recipe-com-btn')
    expect(btn.classes('recipe-com-btn--connected')).toBe(cls === 'recipe-com-btn--connected')
    expect(btn.classes('recipe-com-btn--failed')).toBe(cls === 'recipe-com-btn--failed')
    expect(wrapper.findComponent(CommSettingViewStub).exists()).toBe(false)
  })

  it('keeps the comm status across remounts', async () => {
    const { entryManager, pinia, tab } = setup()
    const first = mountRecipe(entryManager, tab.rootEntryId, pinia)
    await closeCommSetting(first, true)
    first.unmount()

    const second = mountRecipe(entryManager, tab.rootEntryId, pinia)

    expect(second.find('.recipe-com-btn').classes()).toContain('recipe-com-btn--connected')
  })
})
