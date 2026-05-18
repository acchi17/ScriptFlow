import { ref } from 'vue'
import { useSystemState } from './useSystemState'

/**
 * Provides drag functionality as a composable function
 * @returns {Object} Drag-related state and methods
 */
export function useDraggable() {
  const dragDropState = useSystemState()
  // Dragging state
  const isDragging = ref(false)
  
  // Custom callback for drag start event
  let onDragStartCallback = null
  
  /**
   * Set the callback for drag start event
   * @param {Function} callback - Callback function to execute on drag start
   */
  const setOnDragStartCallback = (callback) => {
    onDragStartCallback = callback
  }
  
  /**
   * Handle drag start event
   * @param {DragEvent} event - The drag event
   */
  const onDragStart = (event) => {
    if (dragDropState.isExecuting.value) {
      event.preventDefault()
      return
    }
    isDragging.value = true
    dragDropState.activateDragging()
    if (onDragStartCallback) {
      onDragStartCallback(event, dragDropState)
    }
  }
  
  /**
   * Handle drag end event
   */
  const onDragEnd = () => {
    isDragging.value = false
    dragDropState.deactivateDragging()
  }
  
  // Return public state and methods
  return {
    isDragging,
    setOnDragStartCallback,
    onDragStart,
    onDragEnd
  }
}
