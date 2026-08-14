import { inject } from 'vue'

export function useEntryOperation() {
  const entryManager = inject('entryManager')

  const addEntry = (type, parentId, name, index) => {
    const entryId = entryManager.addEntry(type, name)
    entryManager.moveEntry(entryId, parentId, index)
    return entryId
  }

  const removeEntry = (entryId) => {
    entryManager.removeEntry(entryId)
  }

  const reorderEntry = (parentId, entryId, index) => {
    entryManager.reorderEntry(parentId, entryId, index)
  }

  const moveEntry = (entryId, targetParentId, index) => {
    entryManager.moveEntry(entryId, targetParentId, index)
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

  return {
    addEntry,
    removeEntry,
    reorderEntry,
    moveEntry,
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
  }
}
