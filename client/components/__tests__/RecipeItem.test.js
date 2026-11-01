import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeItem from '@/components/RecipeItem.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'

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

function mountRecipe(entryManager, entryId) {
  return mount(RecipeItem, {
    props: { entryId },
    global: {
      provide: {
        entryManager,
        entryExecutionService: {},
        entryPersistanceService: {}
      },
      stubs: {
        ConnectionView: ConnectionViewStub,
        ContainerChildren: true,
        CommSettingView: true
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
