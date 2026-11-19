import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExecutionLogView from '@/components/ExecutionLogView.vue'
import MainArea from '@/components/MainArea.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import ExecutionLogService from '@/services/log/ExecutionLogService.js'
import { useTabStore } from '@/stores/useTabStore.js'
import { useSystemState } from '@/composables/useSystemState.js'

function addChild(entryManager, parentId, name, type = 'block') {
  const id = entryManager.addEntry(type, name)
  entryManager.moveEntry(id, parentId, 0)
  return id
}

function createEntryExecutionServiceStub() {
  return {
    createComm: vi.fn(),
    deleteComm: vi.fn().mockResolvedValue(false),
    shutdownRunner: vi.fn().mockResolvedValue(undefined)
  }
}

// Real EntryHandlerFacade, ExecutionLogService and useTabStore, with two tabs.
function setupTwoTabs() {
  const entryManager = new EntryHandlerFacade()
  const executionLogService = new ExecutionLogService(entryManager)
  const entryExecutionService = createEntryExecutionServiceStub()
  const app = createApp({})
  app.provide('entryManager', entryManager)
  app.provide('entryExecutionService', entryExecutionService)
  app.provide('entryPersistanceService', {})
  app.provide('executionLogService', executionLogService)
  const pinia = createPinia()
  app.use(pinia)
  setActivePinia(pinia)
  const store = useTabStore()
  const t1 = store.createTab()
  const t2 = store.createTab()
  return { entryManager, executionLogService, pinia, store, t1, t2 }
}

function mountView({ pinia, entryManager, executionLogService }) {
  return mount(ExecutionLogView, {
    global: {
      plugins: [pinia],
      provide: { entryManager, executionLogService }
    }
  })
}

// Rows of the table in display order: entry rows by entry ID, footer rows as 'end'
function listedRows(wrapper) {
  return wrapper.findAll('tbody tr').map(tr =>
    tr.classes('container-group-footer') ? 'end' : tr.find('td.col-id').text()
  )
}

function listedIds(wrapper) {
  return wrapper.findAll('tbody tr.entry-row td.col-id').map(td => td.text())
}

describe('ExecutionLogView active tab', () => {
  let ctx
  let childA
  let childB

  beforeEach(() => {
    ctx = setupTwoTabs()
    const { entryManager, executionLogService, t1, t2 } = ctx
    childA = addChild(entryManager, t1.rootEntryId, 'Child A')
    childB = addChild(entryManager, t2.rootEntryId, 'Child B')

    // Recipe run in each tab: root container with one child
    executionLogService.addLog(t1.rootEntryId, {}, 'e1')
    executionLogService.addLog(childA, {}, 'e1-1', 'e1')
    executionLogService.addLog(t2.rootEntryId, {}, 'e2')
    executionLogService.addLog(childB, {}, 'e2-1', 'e2')
  })

  it('lists only the active tab\'s rows, hiding its root container row', async () => {
    const wrapper = mountView(ctx)
    // t2 is active after createTab()
    expect(listedIds(wrapper)).toEqual([childB])

    ctx.store.setActiveTab(ctx.t1.id)
    await nextTick()
    expect(listedIds(wrapper)).toEqual([childA])
    expect(wrapper.findAll('tbody tr.container-group-footer')).toHaveLength(0)
  })

  it('shows the empty panel when no tab is open', async () => {
    const wrapper = mountView(ctx)
    expect(wrapper.find('.empty-panel').exists()).toBe(false)

    await ctx.store.closeTab(ctx.t1.id)
    await ctx.store.closeTab(ctx.t2.id)
    await nextTick()

    expect(ctx.store.tabs).toHaveLength(0)
    expect(wrapper.find('.empty-panel').exists()).toBe(true)
    expect(wrapper.find('.log-table').exists()).toBe(false)
  })

  it('lists nested container runs newest first with sandwich rows under the hidden root row', async () => {
    const { entryManager, executionLogService, t1 } = ctx
    const outer = addChild(entryManager, t1.rootEntryId, 'Outer', 'container')
    const inner = addChild(entryManager, outer, 'Inner', 'container')
    const leaf = addChild(entryManager, inner, 'Leaf')
    const block = addChild(entryManager, t1.rootEntryId, 'Block')

    // Second recipe run in tab 1: root > [outer > [inner > [leaf]], block]
    executionLogService.addLog(t1.rootEntryId, {}, 'r2')
    executionLogService.addLog(outer, {}, 'r2-1', 'r2')
    executionLogService.addLog(inner, {}, 'r2-1-1', 'r2-1')
    executionLogService.addLog(leaf, {}, 'r2-1-1-1', 'r2-1-1')
    executionLogService.addLog(block, {}, 'r2-2', 'r2')

    ctx.store.setActiveTab(t1.id)
    const wrapper = mountView(ctx)
    await nextTick()

    // Newest run (r2) first, then the first run (e1); no root rows or root footers
    expect(listedRows(wrapper)).toEqual([
      outer, inner, leaf, 'end', 'end', block,
      childA
    ])
    expect(wrapper.findAll('tbody tr.container-row')).toHaveLength(2)
  })

  it('lists a single block run in a tab as a top-level row', async () => {
    const { entryManager, executionLogService, t2 } = ctx
    const single = addChild(entryManager, t2.rootEntryId, 'Single')
    executionLogService.addLog(single, {}, 's1')
    executionLogService.updateLog('s1', { success: true })

    const wrapper = mountView(ctx)
    await nextTick()

    // Newest first: the single block run, then the recipe run's child
    expect(listedRows(wrapper)).toEqual([single, childB])
    const row = wrapper.findAll('tbody tr.entry-row')[0]
    expect(row.classes('block-row')).toBe(true)
    expect(row.find('.col-status').text()).toBe('Success')

    ctx.store.setActiveTab(ctx.t1.id)
    await nextTick()
    expect(listedIds(wrapper)).toEqual([childA])
  })
})

describe('ExecutionLogView Clear', () => {
  it('empties only the active tab\'s log', async () => {
    const ctx = setupTwoTabs()
    const { entryManager, executionLogService, store, t1, t2 } = ctx
    const childA = addChild(entryManager, t1.rootEntryId, 'Child A')
    const childB = addChild(entryManager, t2.rootEntryId, 'Child B')
    executionLogService.addLog(t1.rootEntryId, {}, 'e1')
    executionLogService.addLog(childA, {}, 'e1-1', 'e1')
    executionLogService.addLog(t2.rootEntryId, {}, 'e2')
    executionLogService.addLog(childB, {}, 'e2-1', 'e2')

    const wrapper = mountView(ctx)
    store.setActiveTab(t1.id)
    await nextTick()
    await wrapper.find('.clear-button').trigger('click')
    expect(listedIds(wrapper)).toEqual([])
    expect(wrapper.find('.empty-panel').exists()).toBe(true)

    store.setActiveTab(t2.id)
    await nextTick()
    expect(listedIds(wrapper)).toEqual([childB])
  })
})

// The panel visibility (v-show="showLog") lives in MainArea.vue, so MainArea is
// mounted with the real ExecutionLogView (see the plan's Notes for reviewer N3).
describe('ExecutionLogView panel visibility', () => {
  let wrapper
  let systemState

  afterEach(() => {
    // showLog is module-level state shared by every test; restore it to closed
    if (systemState?.showLog.value) systemState.toggleLog()
    wrapper?.unmount()
    wrapper = null
    systemState = null
  })

  function mountMainArea() {
    const entryManager = new EntryHandlerFacade()
    const executionLogService = new ExecutionLogService(entryManager)
    const pinia = createPinia()
    wrapper = mount(MainArea, {
      attachTo: document.body,
      global: {
        plugins: [pinia],
        provide: {
          entryManager,
          entryExecutionService: createEntryExecutionServiceStub(),
          entryPersistanceService: {},
          executionLogService
        },
        stubs: {
          RecipeItem: { props: ['entryId'], template: '<div class="recipe-item-stub" />' }
        }
      }
    })
    systemState = wrapper.vm.$.appContext.app.runWithContext(() => useSystemState())
    return { entryManager, executionLogService, store: useTabStore(pinia) }
  }

  it('stays open across tab switches and shows the new tab\'s log; closed for every tab', async () => {
    const { entryManager, executionLogService, store } = mountMainArea()
    // MainArea creates the first tab on startup
    const t1 = store.tabs[0]
    const t2 = store.createTab()
    const childA = addChild(entryManager, t1.rootEntryId, 'Child A')
    const childB = addChild(entryManager, t2.rootEntryId, 'Child B')
    executionLogService.addLog(childA, {}, 'a1')
    executionLogService.addLog(childB, {}, 'b1')

    const popup = () => wrapper.find('.log-popup')
    await nextTick()
    expect(popup().isVisible()).toBe(false)

    systemState.toggleLog()
    await nextTick()
    expect(popup().isVisible()).toBe(true)
    expect(listedIds(popup())).toEqual([childB])

    store.setActiveTab(t1.id)
    await nextTick()
    expect(popup().isVisible()).toBe(true)
    expect(listedIds(popup())).toEqual([childA])

    systemState.toggleLog()
    await nextTick()
    expect(popup().isVisible()).toBe(false)

    store.setActiveTab(t2.id)
    await nextTick()
    expect(popup().isVisible()).toBe(false)
  })
})
