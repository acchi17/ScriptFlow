import { ref, readonly } from 'vue'
import { useSystemState } from './useSystemState'

// Execution lock. Kept at module level so every caller of useEntryOperation()
// shares one app-wide lock (MainArea/SideArea overlays, drag & drop, Run/Load/Save buttons).
const isExecuting = ref(false)

/**
 * Busy-state handling for long-running operations: execute() runs any async
 * function while holding the app-wide execution lock (isExecuting).
 */
export function useEntryOperation() {
  const { cancelConnection } = useSystemState()

  /**
   * Run an async function while isExecuting is true. isExecuting is turned off
   * when the function settles, whether it resolves or throws.
   * @param {Function} asyncFn Async function to run
   * @param {...*} args Arguments passed to asyncFn
   * @returns {Promise<*>} The value asyncFn resolves to
   */
  async function execute(asyncFn, ...args) {
    cancelConnection()
    isExecuting.value = true
    try {
      return await asyncFn(...args)
    } finally {
      isExecuting.value = false
    }
  }

  return {
    isExecuting: readonly(isExecuting),
    execute
  }
}
