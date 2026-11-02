import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MainArea from '@/components/MainArea.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import { useTabStore } from '@/stores/useTabStore.js'

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
          deleteComm: vi.fn(),
          shutdownRunner: vi.fn()
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

  it('keeps the static single "Recipe" tab in the tab bar', () => {
    const { wrapper } = mountMainArea()

    const tabs = wrapper.findAll('.tab-bar .tab')
    expect(tabs).toHaveLength(1)
    expect(tabs[0].text()).toBe('Recipe')
  })
})
