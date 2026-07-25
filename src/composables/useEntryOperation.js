import { inject } from 'vue'
import Block from '../models/Block'
import Container from '../models/Container'
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
    const newBlock = new Block(name)
    entryManager.addEntry(parentId, newBlock, index)
    const defaultParams = entryDefinitionService.getBlockParamDef(name)
    entryParamManager.setInputParamDef(newBlock.id, defaultParams.input)
    entryParamManager.setOutputParamDef(newBlock.id, defaultParams.output)
    return newBlock
  }

  const addContainer = (parentId, name, index) => {
    const newContainer = new Container(name)
    entryManager.addEntry(parentId, newContainer, index)
    return newContainer
  }

  const removeEntry = (id) => {
    const selectedId = getSelectedEntryId.value
    const descendantIds = entryManager.getAllDescendantIds(id)
    if (selectedId && (selectedId === id || descendantIds.includes(selectedId))) {
      clearSelection()
    }
    //;[id, ...descendantIds].forEach(eid => entryConnectionManager.removeConnectionsByEntryId(eid))
    [id, ...descendantIds].forEach(eid => entryConnectionManager.removeConnectionsByEntryId(eid))
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
    if (!entry || entry.type !== 'container') return
    const childIds = entry.children.map(c => c.id)
    childIds.forEach(childId => removeEntry(childId))
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
    getInputParams,
    getOutputParams,
    setInputParam,
  }
}
