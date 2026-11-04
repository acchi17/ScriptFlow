import { describe, it, expect, vi } from 'vitest'
import { createApp, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExecutionLogView from '@/components/ExecutionLogView.vue'
import EntryHandlerFacade from '@/ecs/component-handlers/EntryHandlerFacade.js'
import { useTabStore } from '@/stores/useTabStore.js'

function execution(executionId, entryId, entryName, isContainer) {
  return {
    executionId,
    entryId,
    entryName,
    isContainer,
    timestamp: 0,
    execTime: 1,
    inputParams: {},
    result: { success: true }
  }
}

describe('ExecutionLogView root rows', () => {
  it('hides the root container rows of every tab and shows their children', () => {
    const entryManager = new EntryHandlerFacade()
    const app = createApp({})
    app.provide('entryManager', entryManager)
    app.provide('entryExecutionService', {})
    const pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
    const store = useTabStore()
    const t1 = store.createTab()
    const t2 = store.createTab()

    const logs = ref({
      rootExecutions: [
        execution('e1', t1.rootEntryId, 'root-container', true),
        execution('e2', t2.rootEntryId, 'root-container', true)
      ],
      executionsByParent: {
        e1: [execution('e1-1', 'child-a', 'Child A', false)],
        e2: [execution('e2-1', 'child-b', 'Child B', false)]
      }
    })
    const executionLogService = { getLogs: vi.fn(() => logs), clearLogs: vi.fn() }

    const wrapper = mount(ExecutionLogView, {
      global: {
        plugins: [pinia],
        provide: { entryManager, executionLogService }
      }
    })

    const ids = wrapper.findAll('tbody tr.entry-row td.col-id').map(td => td.text())
    expect(ids).toEqual(['child-b', 'child-a'])
    expect(ids).not.toContain(t1.rootEntryId)
    expect(ids).not.toContain(t2.rootEntryId)
    expect(wrapper.findAll('tbody tr.container-group-footer')).toHaveLength(0)
  })
})
