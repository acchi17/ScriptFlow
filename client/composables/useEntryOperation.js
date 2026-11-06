import { ref, readonly, inject } from 'vue'
import { useSystemState } from './useSystemState'
import { useTabStore, labelFromFileName } from '../stores/useTabStore'

// Execution lock. Kept at module level so every caller of useEntryOperation()
// shares one app-wide lock (MainArea/SideArea overlays, drag & drop, Run/Load/Save buttons).
const isExecuting = ref(false)

const lastReport = ref(null)

/**
 * Busy-state handling for long-running operations: execute() runs any async
 * function while holding the app-wide execution lock (isExecuting), and
 * saveRecipe()/loadRecipe() wrap EntryPersistanceService with it. Error state is
 * shared with useSystemState (lastError).
 */
export function useEntryOperation() {
  const entryPersistanceService = inject('entryPersistanceService')
  const { cancelConnection, setError, clearError } = useSystemState()

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

  /**
   * Save the recipe of the given root. The tab's label is suggested as the file
   * name; on success the tab's label becomes the saved file name (without extension).
   * @param {string} rootId - ID of the root entry to save
   */
  async function saveRecipe(rootId) {
    const tabStore = useTabStore()
    clearError()
    await execute(async () => {
      try {
        const tab = tabStore.getTabByRootId(rootId)
        const savedName = await entryPersistanceService.saveRecipe(rootId, tab?.label)
        tabStore.setTabLabelFromFileName(rootId, savedName)
      } catch (error) {
        setError(error.message)
      }
    })
  }

  /**
   * Let the user pick a recipe file and load it into a newly created tab.
   * @returns {Promise<boolean>} true if a recipe was actually loaded (false if canceled or failed)
   */
  async function loadRecipe() {
    const tabStore = useTabStore()
    clearError()
    return execute(async () => {
      let tab = null
      try {
        const picked = await entryPersistanceService.pickRecipe()
        if (!picked) return false

        tab = tabStore.createTab(labelFromFileName(picked.fileName))
        if (!tab) {
          setError('Cannot open more tabs.')
          return false
        }

        const report = await entryPersistanceService.restoreRecipe(picked.data, tab.rootEntryId)
        lastReport.value = report
        return true
      } catch (error) {
        if (tab) {
          // Do not leave a partially restored recipe behind.
          await tabStore.closeTab(tab.id)
        }
        setError(error.message)
        return false
      }
    })
  }

  return {
    isExecuting: readonly(isExecuting),
    execute,
    lastReport,
    saveRecipe,
    loadRecipe
  }
}
