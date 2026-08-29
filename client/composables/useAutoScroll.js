import { watch } from 'vue'
import { useSystemState } from './useSystemState'

const EDGE_THRESHOLD = 40   // px from top/bottom edge that triggers scrolling
const MAX_SCROLL_SPEED = 15 // px scrolled per animation frame at the edge

/**
 * Auto-scrolls the given scrollable element while a drag is in progress
 * and the pointer is near its top/bottom edge.
 * @param {import('vue').Ref<HTMLElement|null>} scrollElementRef
 */
export function useAutoScroll(scrollElementRef) {
  const { isDragging } = useSystemState()
  let scrollSpeed = 0
  let animationFrameId = null

  function step() {
    const el = scrollElementRef.value
    if (el && scrollSpeed !== 0) {
      el.scrollTop += scrollSpeed
      animationFrameId = requestAnimationFrame(step)
    } else {
      animationFrameId = null
    }
  }

  function onDragOver(event) {
    const el = scrollElementRef.value
    if (!el) return

    const rect = el.getBoundingClientRect()
    const distanceFromTop = event.clientY - rect.top
    const distanceFromBottom = rect.bottom - event.clientY

    if (distanceFromTop < EDGE_THRESHOLD) {
      scrollSpeed = -MAX_SCROLL_SPEED * (1 - distanceFromTop / EDGE_THRESHOLD)
    } else if (distanceFromBottom < EDGE_THRESHOLD) {
      scrollSpeed = MAX_SCROLL_SPEED * (1 - distanceFromBottom / EDGE_THRESHOLD)
    } else {
      scrollSpeed = 0
    }

    if (scrollSpeed !== 0 && animationFrameId === null) {
      animationFrameId = requestAnimationFrame(step)
    }
  }

  watch(isDragging, (dragging) => {
    if (!dragging) {
      scrollSpeed = 0
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }
  })

  return { onDragOver }
}
