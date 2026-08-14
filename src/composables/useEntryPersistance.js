import { ref, inject } from 'vue'
import { useSystemState } from './useSystemState'

const lastReport = ref(null)

/**
 * Vue-side glue for EntryPersistanceService: last report, and resetting
 * transient UI state before a recipe is loaded. Busy/error state is
 * shared with useSystemState (isExecuting/lastError).
 */
export function useEntryPersistance() {
  const entryPersistanceService = inject('entryPersistanceService')
  const { resetState, setExecuting, setError, clearError } = useSystemState()

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
    lastReport,
    saveRecipe,
    loadRecipe
  }
}
