import { ref, readonly, inject } from 'vue'
import { useSystemState } from './useSystemState'

const isBusy = ref(false)
const lastError = ref(null)
const lastReport = ref(null)

/**
 * Vue-side glue for EntryPersistanceService: busy flag, last error/report,
 * and resetting transient UI state before a recipe is loaded.
 */
export function useEntryPersistance() {
  const entryPersistanceService = inject('entryPersistanceService')
  const { resetState } = useSystemState()

  const saveRecipe = async (fileName, name) => {
    isBusy.value = true
    lastError.value = null
    try {
      await entryPersistanceService.saveRecipe(fileName, name)
    } catch (error) {
      lastError.value = error.message
    } finally {
      isBusy.value = false
    }
  }

  const loadRecipe = async (fileName) => {
    isBusy.value = true
    lastError.value = null
    resetState()
    try {
      lastReport.value = await entryPersistanceService.loadRecipe(fileName)
    } catch (error) {
      lastError.value = error.message
    } finally {
      isBusy.value = false
    }
  }

  return {
    isBusy: readonly(isBusy),
    lastError,
    lastReport,
    saveRecipe,
    loadRecipe
  }
}
