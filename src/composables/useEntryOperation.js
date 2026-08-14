import { computed, inject, watch, nextTick } from 'vue'
import { useSystemState } from './useSystemState'

export function useEntryOperation() {
  const entryManager = inject('entryManager')
  const {
    getSelectedEntryId,
    clearSelection,
    cancelConnection
  } = useSystemState()

  const addEntry = (type, parentId, name, index) => {
    const entryId = entryManager.addEntry(type, name)
    entryManager.moveEntry(entryId, parentId, index)
    return entryId
  }

  const removeEntry = (entryId) => {
    const selectedId = getSelectedEntryId.value
    const descendantIds = entryManager.getAllDescendants(entryId)
    if (selectedId && (selectedId === entryId || descendantIds.includes(selectedId))) {
      clearSelection()
    }
    cancelConnection()
    entryManager.removeEntry(entryId)
  }

  const reorderEntry = (parentId, entryId, index) => {
    entryManager.reorderEntry(parentId, entryId, index)
  }

  const moveEntry = (entryId, targetParentId, index) => {
    entryManager.moveEntry(entryId, targetParentId, index)
  }

  const clearContainer = (entryId) => {
    if (!entryManager.isContainer(entryId)) return
    const childIds = entryManager.getChildren(entryId)
    childIds.forEach(childId => removeEntry(childId))
  }

  const isContainer = (entryId) => {
    return entryManager.isContainer(entryId)
  }

  const isBlock = (entryId) => {
    return entryManager.isBlock(entryId)
  }

  const getAllDescendantIds = (entryId) => {
    return entryManager.getAllDescendants(entryId)
  }

  const getParentId = (entryId) => {
    return entryManager.getParent(entryId)
  }

  const getEntryName = (entryId) => {
    return entryManager.getEntryName(entryId)
  }

  const getRootEntryId = () => {
    return entryManager.getRootEntry()
  }

  const getChildren = (entryId) => {
    return entryManager.getChildren(entryId)
  }

  const hierarchyTick = entryManager.hierarchyTick
  const outputParamsTick = entryManager.paramHandler.outputParamsTick

  const getInputParams = (entryId) => {
    return entryManager.paramHandler.getInputParams(entryId)
  }

  const getOutputParams = (entryId) => {
    return entryManager.paramHandler.getOutputParams(entryId)
  }

  const setInputParam = (entryId, paramName, value) => {
    entryManager.paramHandler.setInputParam(entryId, paramName, value)
  }

  const hasParams = (entryId) => {
    return Object.keys(entryManager.paramHandler.getInputParamTypes(entryId)).length > 0 ||
      Object.keys(entryManager.paramHandler.getOutputParamTypes(entryId)).length > 0
  }

  /**
   * Watches the entry panel for structural changes and, on each change, remeasures the
   * Y position and height of every entry's header element, writing them into
   * EntryManager. Used to align horizontal lines in the connection panel with
   * entry headers.
   *
   * @param {Ref<HTMLElement>} entryPanelRef - Ref to the entry panel (.entry-panel)
   * @returns {ComputedRef<Array<[string, { y: number, height: number }]>>} Reactive layout
   *   entries keyed by entryId, kept in sync by EntryManager. Consumers (e.g. ConnectionView)
   *   read it to position connection lines against entry headers.
   */
  const trackEntryLayout = (entryPanelRef) => {
    function measureEntries() {
      if (!entryPanelRef.value) return

      const panelRect = entryPanelRef.value.getBoundingClientRect()

      const nodes = entryPanelRef.value.querySelectorAll('[data-entry-id]')
      entryManager.clearLayouts()
      for (const node of nodes) {
        const rect = node.getBoundingClientRect()
        entryManager.addLayout(
          node.dataset.entryId,
          rect.top - panelRect.top,
          rect.height
        )
      }
    }

    // Re-measure on structural changes (add/remove/reorder entries)
    watch(() => entryManager.hierarchyTick.value, () => nextTick(() => measureEntries()))

    return computed(() => {
      entryManager.layoutsTick.value
      return entryManager.getAllLayouts()
    })
  }

  return {
    addEntry,
    removeEntry,
    reorderEntry,
    moveEntry,
    clearContainer,
    getAllDescendantIds,
    getParentId,
    getEntryName,
    getRootEntryId,
    getChildren,
    hierarchyTick,
    outputParamsTick,
    getInputParams,
    getOutputParams,
    setInputParam,
    hasParams,
    isContainer,
    isBlock,
    trackEntryLayout,
  }
}
