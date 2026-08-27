import { ref, inject } from 'vue'
import { useSystemState } from './useSystemState'

const lastReport = ref(null)

/**
 * Vue-side glue for EntryExecutionService and EntryPersistanceService: executing
 * entries, saving/loading recipes, and the last load report. Busy/error state is
 * shared with useSystemState (isExecuting/lastError).
 */
export function useEntryOperation() {
  const entryExecutionService = inject('entryExecutionService')
  const entryPersistanceService = inject('entryPersistanceService')
  const { setExecuting, resetState, setError, clearError } = useSystemState()

  /**
   * Execute an entry (Block or Container)
   * @param {string} entryId Id of the entry to execute
   */
  const executeEntry = async (entryId) => {
    if (!entryId) return

    setExecuting(true, entryId)
    try {
      await entryExecutionService.executeEntry(entryId)
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500))
      setExecuting(false)
    }
  }

  const saveRecipe = async (name) => {
    setExecuting(true)
    clearError()
    try {
      await entryPersistanceService.saveRecipe(name)
    } catch (error) {
      setError(error.message)
    } finally {
      setExecuting(false)
    }
  }

  /**
   * @returns {Promise<boolean>} true if a recipe was actually loaded (false if the user canceled)
   */
  const loadRecipe = async () => {
    setExecuting(true)
    clearError()
    try {
      const report = await entryPersistanceService.loadRecipe()
      if (!report) return false
      resetState()
      lastReport.value = report
      return true
    } catch (error) {
      setError(error.message)
      return false
    } finally {
      setExecuting(false)
    }
  }

  return {
    executeEntry,
    lastReport,
    saveRecipe,
    loadRecipe
  }
}
