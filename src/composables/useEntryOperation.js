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

  const removeEntry = (entryId) => {
    const selectedId = getSelectedEntryId.value
    const descendantIds = entryManager.getAllDescendantIds(entryId)
    if (selectedId && (selectedId === entryId || descendantIds.includes(selectedId))) {
      clearSelection()
    }
    [entryId, ...descendantIds].forEach(eid => {
      entryConnectionManager.removeConnectionsByEntryId(eid)
      entryParamManager.removeParams(eid)
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

  const getRootEntry = () => {
    return entryManager.getRootEntry()
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
