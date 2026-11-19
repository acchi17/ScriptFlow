import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExecutionLogView from '@/components/ExecutionLogView.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import ExecutionLogService from '@/services/log/ExecutionLogService.js'
import { useTabStore } from '@/stores/useTabStore.js'

function addChild(entryManager, parentId, name) {
  const id = entryManager.addEntry('block', name)
  entryManager.moveEntry(id, parentId, 0)
  return id
}

describe('ExecutionLogView active tab', () => {
  let entryManager
  let executionLogService
  let pinia
  let store
  let t1
  let t2
  let childA
  let childB

  beforeEach(() => {
    entryManager = new EntryHandlerFacade()
    executionLogService = new ExecutionLogService(entryManager)
    const app = createApp({})
    app.provide('entryManager', entryManager)
    app.provide('entryExecutionService', {})
    app.provide('entryPersistanceService', {})
    app.provide('executionLogService', executionLogService)
    pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
    store = useTabStore()
    t1 = store.createTab()
    t2 = store.createTab()
    childA = addChild(entryManager, t1.rootEntryId, 'Child A')
    childB = addChild(entryManager, t2.rootEntryId, 'Child B')

    // Recipe run in each tab: root container with one child
    executionLogService.addLog(t1.rootEntryId, {}, 'e1')
    executionLogService.addLog(childA, {}, 'e1-1', 'e1')
    executionLogService.addLog(t2.rootEntryId, {}, 'e2')
    executionLogService.addLog(childB, {}, 'e2-1', 'e2')
  })

  function mountView() {
    return mount(ExecutionLogView, {
      global: {
        plugins: [pinia],
        provide: { entryManager, executionLogService }
      }
    })
  }

  function listedIds(wrapper) {
    return wrapper.findAll('tbody tr.entry-row td.col-id').map(td => td.text())
  }

  it('lists only the active tab\'s rows, hiding its root container row', async () => {
    const wrapper = mountView()
    // t2 is active after createTab()
    expect(listedIds(wrapper)).toEqual([childB])

    store.setActiveTab(t1.id)
    await nextTick()
    expect(listedIds(wrapper)).toEqual([childA])
    expect(wrapper.findAll('tbody tr.container-group-footer')).toHaveLength(0)
  })

  it('Clear empties only the active tab\'s log', async () => {
    const wrapper = mountView()
    store.setActiveTab(t1.id)
    await nextTick()
    await wrapper.find('.clear-button').trigger('click')
    expect(listedIds(wrapper)).toEqual([])

    store.setActiveTab(t2.id)
    await nextTick()
    expect(listedIds(wrapper)).toEqual([childB])
  })
})
