import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionView from '@/components/ConnectionView.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'

function addAndAttach(entryManager, parentId, type, name, index) {
  const entryId = entryManager.addEntry(type, name)
  entryManager.moveEntry(entryId, parentId, index)
  return entryId
}

function connect(entryManager, outputEntryId, inputEntryId) {
  return entryManager.addConnection(
    { entryId: outputEntryId, category: 'output', dataType: 'integer', paramName: 'Result' },
    { entryId: inputEntryId, category: 'input', dataType: 'integer', paramName: 'NumberA' }
  )
}

const ConnectionItemStub = {
  name: 'ConnectionItem',
  props: {
    laneIndex: { type: Number, default: 0 },
    y1: { type: Number, default: 0 },
    y2: { type: Number, default: 0 },
    outputEntryId: { type: String, default: '' },
    inputEntryId: { type: String, default: '' }
  },
  template: '<g class="connection-item-stub" />'
}

function mountView(entryManager, rootId) {
  return mount(ConnectionView, {
    props: { rootId },
    global: {
      provide: { entryManager },
      stubs: { ConnectionItem: ConnectionItemStub }
    }
  })
}

describe('ConnectionView rootId filter', () => {
  it("renders only the given root's connections", () => {
    const entryManager = new EntryHandlerFacade()
    const rootAId = addAndAttach(entryManager, null, 'container', 'rootA', 0)
    const rootBId = addAndAttach(entryManager, null, 'container', 'rootB', 0)
    const a1 = addAndAttach(entryManager, rootAId, 'block', 'A1', 0)
    const a2 = addAndAttach(entryManager, rootAId, 'block', 'A2', 1)
    const a3 = addAndAttach(entryManager, rootAId, 'block', 'A3', 2)
    const b1 = addAndAttach(entryManager, rootBId, 'block', 'B1', 0)
    const b2 = addAndAttach(entryManager, rootBId, 'block', 'B2', 1)
    expect(connect(entryManager, a1, a2)).toBeTruthy()
    expect(connect(entryManager, a2, a3)).toBeTruthy()
    expect(connect(entryManager, b1, b2)).toBeTruthy()
    for (const [id, y] of [[a1, 0], [a2, 30], [a3, 60], [b1, 0], [b2, 30]]) {
      entryManager.addLayout(id, y, 20)
    }

    const wrapperA = mountView(entryManager, rootAId)
    const itemsA = wrapperA.findAllComponents(ConnectionItemStub)
    expect(itemsA).toHaveLength(2)
    for (const item of itemsA) {
      expect([a1, a2, a3]).toContain(item.props('outputEntryId'))
      expect([a1, a2, a3]).toContain(item.props('inputEntryId'))
    }

    const wrapperB = mountView(entryManager, rootBId)
    const itemsB = wrapperB.findAllComponents(ConnectionItemStub)
    expect(itemsB).toHaveLength(1)
    expect(itemsB[0].props('outputEntryId')).toBe(b1)
    expect(itemsB[0].props('inputEntryId')).toBe(b2)
  })

  it("re-renders when the root's layouts change", async () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const a1 = addAndAttach(entryManager, rootId, 'block', 'A1', 0)
    const a2 = addAndAttach(entryManager, rootId, 'block', 'A2', 1)
    connect(entryManager, a1, a2)

    const wrapper = mountView(entryManager, rootId)
    expect(wrapper.findAllComponents(ConnectionItemStub)).toHaveLength(0)

    entryManager.addLayout(a1, 0, 20)
    entryManager.addLayout(a2, 30, 20)
    await wrapper.vm.$nextTick()

    expect(wrapper.findAllComponents(ConnectionItemStub)).toHaveLength(1)
  })

  it('renders nothing and does not throw once its root has been removed', async () => {
    const entryManager = new EntryHandlerFacade()
    const rootId = addAndAttach(entryManager, null, 'container', 'root', 0)
    const wrapper = mountView(entryManager, rootId)

    entryManager.removeEntry(rootId)
    entryManager.connectionsTick.value++
    await wrapper.vm.$nextTick()

    expect(wrapper.findAllComponents(ConnectionItemStub)).toHaveLength(0)
  })
})
