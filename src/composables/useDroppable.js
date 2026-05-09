import { ref, computed } from 'vue'
import { useSystemState } from './useSystemState'

/**
 * Provides drop functionality as a composable function
 * @returns {Object} Drop-related state and methods
 */
export function useDroppable() {
  const dragDropState = useSystemState()
  // State indicating whether drag is entering the area
  const isDragEntering = ref(false)
  
  // Counter for drag enter events (supports nested elements)
  const dragEnterCount = ref(0)
  
  // Callback function to execute on drop
  let OnDropCallBack = null

  /**
   * Computed property that determines if the entry can accept drops
   * @param {string} entryId - ID of this container
   * @returns {boolean} Whether drops are allowed
   */
  const isDroppable = (entryId) => {
    return computed(() => {
      // Not droppable if currently executing an entry
      if (dragDropState.isExecuting.value) return false
      // Not droppable if no dragging is occurring
      if (!dragDropState.isDragging.value) {
        return false
      }
      // Cannot drop onto itself or its descendants
      const canDrop = !dragDropState.hasDraggedIds(entryId)
      return canDrop
    })
  }
  
  /**
   * Set the callback for drop event
   * @param {Function} callback - Callback function
   */
  const setOnDropCallBack = (callback) => {
    OnDropCallBack = callback
  }

  /**
   * Handle drag enter event
   * @param {DragEvent} event - The drag event
   */
  const onDragEnter = (event) => {
    event.preventDefault()
    dragEnterCount.value++
    if (dragEnterCount.value === 1) {
      isDragEntering.value = true
    }
  }
  
  /**
   * Handle drag over event
   * @param {DragEvent} event - The drag event
   */
  const onDragOver = (event) => {
    event.preventDefault()
  }
  
  /**
   * Handle drag leave event
   * @param {DragEvent} event - The drag event
   */
  const onDragLeave = (event) => {
    event.preventDefault()
    dragEnterCount.value--
    if (dragEnterCount.value === 0) {
      isDragEntering.value = false
    }
  }
  
  /**
   * Handle drop event
   * @param {DragEvent} event - The drag event
   * @param {number|null} index - Index of drop position
   */
  const onDrop = (event, index = null) => {
    event.preventDefault()
    isDragEntering.value = false
    dragEnterCount.value = 0
    if (OnDropCallBack) {
      OnDropCallBack(event, index)
    }
  }

  // Return public state and methods
  return {
    isDroppable,
    setOnDropCallBack,
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop
  }
}
