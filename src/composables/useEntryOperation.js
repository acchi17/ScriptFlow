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

  const saveRecipe = async (fileName, name) => {
    setExecuting(true)
    clearError()
    try {
      await entryPersistanceService.saveRecipe(fileName, name)
    } catch (error) {
      setError(error.message)
    } finally {
      setExecuting(false)
    }
  }

  const loadRecipe = async (fileName) => {
    setExecuting(true)
    clearError()
    resetState()
    try {
      lastReport.value = await entryPersistanceService.loadRecipe(fileName)
    } catch (error) {
      setError(error.message)
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
