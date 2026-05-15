import { ref, computed, readonly, inject } from 'vue'

// drag & drop
const draggedItemIds = ref(new Set())
const isDragging = ref(false)

// execution lock
const isExecuting = ref(false)

// entry selection
const selectedEntryId = ref(null)

// parameter connection
const connectingSource = ref(null) // null | { entryId, paramName, paramCategory, paramType }

export function useSystemState() {
  const entryManager = inject('entryManager')
  const entryConnectionManager = inject('entryConnectionManager')
  const entryParamManager = inject('entryParamManager')

  // --- drag & drop ---
  const activateDragging = () => { cancelConnection(); isDragging.value = true }
  const deactivateDragging = () => { draggedItemIds.value.clear(); isDragging.value = false }
  const setDraggedIds = (ids) => { draggedItemIds.value = new Set(ids) }
  const hasDraggedIds = (id) => draggedItemIds.value.has(id)

  // --- execution lock ---
  const setExecuting = (value) => { isExecuting.value = value }

  // --- selection ---
  const isSelected = (entryId) => computed(() => selectedEntryId.value === entryId)
  const getSelectedEntryId = computed(() => selectedEntryId.value)
  const setSelection = (entry) => { selectedEntryId.value = entry?.id || null }
  const clearSelection = () => { selectedEntryId.value = null }

  // --- connection ---
  const isConnecting = computed(() => connectingSource.value !== null)
  const getConnectingSource = computed(() => connectingSource.value)

  const isConnectingSource = (entryId, paramName, paramCategory) =>
    computed(() =>
      connectingSource.value !== null &&
      connectingSource.value.entryId === entryId &&
      connectingSource.value.paramName === paramName &&
      connectingSource.value.paramCategory === paramCategory
    )

  const isConnectingTarget = (entryId) =>
    computed(() => {
      if (connectingSource.value === null) return false
      entryManager.updateTick.value
      const srcId = connectingSource.value.entryId
      const srcSeq = entryManager.getSequenceNumber(srcId)
      const dstSeq = entryManager.getSequenceNumber(entryId)
      if (dstSeq === null || srcSeq === null) return false
      if (connectingSource.value.paramCategory === 'input') {
        if (!entryParamManager.hasOutputParam(entryId)) return false
        return dstSeq < srcSeq
      } else {
        if (!entryParamManager.hasInputParam(entryId)) return false
        return dstSeq > srcSeq
      }
    })

  const isConnectedEndPoint = (entryId, paramName, paramCategory) =>
    computed(() =>
      entryConnectionManager
        ? entryConnectionManager.getConnectionsByEndpoint(entryId, paramCategory, paramName).length > 0
        : false
    )

  const startConnection = (entryId, paramName, paramCategory, paramType) => {
    connectingSource.value = { entryId, paramName, paramCategory, paramType }
  }

  const cancelConnection = () => { connectingSource.value = null }

  const endConnection = (entryId, paramName, paramCategory, paramType) => {
    if (!connectingSource.value) return
    const source = connectingSource.value
    if (source.paramCategory === paramCategory) return
    const sourceEndpoint = { entryId: source.entryId, category: source.paramCategory, dataType: source.paramType, paramName: source.paramName }
    const targetEndpoint = { entryId, category: paramCategory, dataType: paramType, paramName }
    const [outputEndpoint, inputEndpoint] = source.paramCategory === 'output'
      ? [sourceEndpoint, targetEndpoint]
      : [targetEndpoint, sourceEndpoint]
    entryConnectionManager.addConnection(outputEndpoint, inputEndpoint)
    cancelConnection()
  }

  // --- combined ---
  const resetState = () => {
    cancelConnection()
    clearSelection()
  }

  return {
    // drag & drop
    isDragging: readonly(isDragging),
    activateDragging,
    deactivateDragging,
    setDraggedIds,
    hasDraggedIds,
    // execution
    isExecuting: readonly(isExecuting),
    setExecuting,
    // selection
    isSelected,
    getSelectedEntryId,
    setSelection,
    clearSelection,
    // connection
    isConnecting,
    isConnectingSource,
    isConnectingTarget,
    isConnectedEndPoint,
    getConnectingSource,
    startConnection,
    cancelConnection,
    endConnection,
    // others
    resetState,
  }
}
