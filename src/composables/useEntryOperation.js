import { inject, watch, nextTick } from 'vue'
import { useSystemState } from './useSystemState'

export function useEntryOperation() {
  const entryManager = inject('entryManager')
  const entryParamManager = inject('entryParamManager')
  const entryDefinitionService = inject('entryDefinitionService')
  const entryConnectionManager = inject('entryConnectionManager')
  const entryLayoutManager = inject('entryLayoutManager')
  const entryTypeStore = inject('entryTypeStore')
  const {
    getSelectedEntryId,
    clearSelection,
    cancelConnection
  } = useSystemState()

  const addBlock = (parentId, name, index) => {
    const blockId = entryManager.addEntry(parentId, 'block', name, index)
    const defaultParams = entryDefinitionService.getBlockParamDef(name)
    entryParamManager.setInputParams(blockId, defaultParams.input)
    entryParamManager.setOutputParams(blockId, defaultParams.output)
    entryTypeStore.add(blockId, 'block', name)
    return blockId
  }

  const addContainer = (parentId, name, index) => {
    const containerId = entryManager.addEntry(parentId, 'container', name, index)
    entryTypeStore.add(containerId, 'container', name)
    return containerId
  }

  const removeEntry = (entryId) => {
    const selectedId = getSelectedEntryId.value
    const descendantIds = entryManager.getAllDescendantIds(entryId)
    if (selectedId && (selectedId === entryId || descendantIds.includes(selectedId))) {
      clearSelection()
    }
    [entryId, ...descendantIds].forEach(eid => {
      entryConnectionManager.removeConnectionsByEntryId(eid)
      entryParamManager.removeParams(eid)
      entryTypeStore.remove(eid)
    })
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
    return entryManager.getAllDescendantIds(entryId)
  }

  const getParentId = (entryId) => {
    return entryManager.getParentId(entryId)
  }

  const getEntry = (entryId) => {
    return entryManager.getEntry(entryId)
  }

  const getEntryName = (entryId) => {
    return entryManager.getEntryName(entryId)
  }

  const getRootEntryId = () => {
    return entryManager.getRootEntryId()
  }

  const getChildren = (entryId) => {
    return entryManager.getChildren(entryId)
  }

  const getInputParams = (entryId) => {
    return entryParamManager.getInputParams(entryId)
  }

  const getOutputParams = (entryId) => {
    return entryParamManager.getOutputParams(entryId)
  }

  const setInputParam = (entryId, paramName, value) => {
    entryParamManager.setInputParam(entryId, paramName, value)
  }

  const hasParams = (entryId) => {
    return Object.keys(entryParamManager.getInputParamTypes(entryId)).length > 0 ||
      Object.keys(entryParamManager.getOutputParamTypes(entryId)).length > 0
  }

  /**
   * Watches the entry panel for structural changes and, on each change, remeasures the
   * Y position and height of every entry's header element, writing them into
   * EntryLayoutManager. Used to align horizontal lines in the connection panel with
   * entry headers.
   *
   * @param {Ref<HTMLElement>} entryPanelRef - Ref to the entry panel (.entry-panel)
   * @returns {Map<string, { y: number, height: number }>} Reactive layout map keyed by
   *   entryId, kept in sync by EntryLayoutManager. Consumers (e.g. ConnectionView) read it
   *   to position connection lines against entry headers.
   */
  const trackEntryLayout = (entryPanelRef) => {
    function measureEntries() {
      if (!entryPanelRef.value) return

      const panelRect = entryPanelRef.value.getBoundingClientRect()

      const nodes = entryPanelRef.value.querySelectorAll('[data-entry-id]')
      entryLayoutManager.clearAll()
      for (const node of nodes) {
        const rect = node.getBoundingClientRect()
        entryLayoutManager.setLayout(
          node.dataset.entryId,
          rect.top - panelRect.top,
          rect.height
        )
      }
    }

    // Re-measure on structural changes (add/remove/reorder entries)
    watch(() => entryManager.updateTick.value, () => nextTick(() => measureEntries()))

    return entryLayoutManager.layoutMap
  }

  return {
    addBlock,
    addContainer,
    removeEntry,
    reorderEntry,
    moveEntry,
    clearContainer,
    getAllDescendantIds,
    getParentId,
    getEntry,
    getEntryName,
    getRootEntryId,
    getChildren,
    getInputParams,
    getOutputParams,
    setInputParam,
    hasParams,
    isContainer,
    isBlock,
    trackEntryLayout,
  }
}
