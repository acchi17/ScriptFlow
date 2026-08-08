import { inject } from 'vue'
import { useSystemState } from './useSystemState'

export function useEntryOperation() {
  const entryManager = inject('entryManager')
  const entryParamManager = inject('entryParamManager')
  const entryDefinitionService = inject('entryDefinitionService')
  const entryConnectionManager = inject('entryConnectionManager')
  const {
    getSelectedEntryId,
    clearSelection,
    cancelConnection
  } = useSystemState()

  const addBlock = (parentId, name, index) => {
    const blockId = entryManager.addEntry(parentId, 'block', name, index)
    const defaultParams = entryDefinitionService.getBlockParamDef(name)
    entryParamManager.setInputParamDef(blockId, defaultParams.input)
    entryParamManager.setOutputParamDef(blockId, defaultParams.output)
    return entryManager.getEntry(blockId)
  }

  const addContainer = (parentId, name, index) => {
    const containerId = entryManager.addEntry(parentId, 'container', name, index)
    return entryManager.getEntry(containerId)
  }

  const removeEntry = (id) => {
    const selectedId = getSelectedEntryId.value
    const descendantIds = entryManager.getAllDescendantIds(id)
    if (selectedId && (selectedId === id || descendantIds.includes(selectedId))) {
      clearSelection()
    }
    [id, ...descendantIds].forEach(eid => {
      entryConnectionManager.removeConnectionsByEntryId(eid)
      entryParamManager.removeParams(eid)
    })
    cancelConnection()
    entryManager.removeEntry(id)
  }

  const reorderEntry = (parentId, entryId, index) => {
    entryManager.reorderEntry(parentId, entryId, index)
  }

  const moveEntry = (entryId, targetParentId, index) => {
    entryManager.moveEntry(entryId, targetParentId, index)
  }

  const clearContainer = (id) => {
    const entry = entryManager.getEntry(id)
    if (!entry || !entryManager.isContainer(entry)) return
    const childIds = entryManager.getChildren(id).map(c => c.id)
    childIds.forEach(childId => removeEntry(childId))
  }

  const isContainer = (entry) => {
    return entryManager.isContainer(entry)
  }

  const isBlock = (entry) => {
    return entryManager.isBlock(entry)
  }

  const getAllDescendantIds = (id) => {
    return entryManager.getAllDescendantIds(id)
  }

  const getParentId = (id) => {
    return entryManager.getParentId(id)
  }

  const getEntry = (id) => {
    return entryManager.getEntry(id)
  }

  const getRootEntry = () => {
    return entryManager.getRootEntry()
  }

  const getChildren = (id) => {
    return entryManager.getChildren(id)
  }

  const getInputParams = (id) => {
    return entryParamManager.getInputParams(id)
  }

  const getOutputParams = (id) => {
    return entryParamManager.getOutputParams(id)
  }

  const setInputParam = (id, paramName, value) => {
    entryParamManager.setInputParam(id, paramName, value)
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
    getRootEntry,
    getChildren,
    getInputParams,
    getOutputParams,
    setInputParam,
    isContainer,
    isBlock,
  }
}
