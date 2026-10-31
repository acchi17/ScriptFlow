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

  /**
   * Create and connect a socket for an entry.
   * @param {string} entryId
   * @param {string} host
   * @param {number} port
   * @returns {Promise<boolean>}
   */
  const createSocket = async (entryId, host, port) => {
    return await entryExecutionService.createComm(entryId, host, port)
  }

  /**
   * Close the socket held by an entry.
   * @param {string} entryId
   * @returns {Promise<boolean>}
   */
  const releaseSocket = async (entryId) => {
    return await entryExecutionService.deleteComm(entryId)
  }

  /**
   * Save the recipe of the given root.
   * @param {string} rootId - ID of the root entry to save
   */
  const saveRecipe = async (rootId) => {
    setExecuting(true)
    clearError()
    try {
      await entryPersistanceService.saveRecipe(rootId)
    } catch (error) {
      setError(error.message)
    } finally {
      setExecuting(false)
    }
  }

  /**
   * Let the user pick a recipe file and restore it into the given root.
   * @param {string} rootId - ID of the root entry to restore into
   * @returns {Promise<boolean>} true if a recipe was actually loaded (false if the user canceled)
   */
  const loadRecipe = async (rootId) => {
    setExecuting(true)
    clearError()
    try {
      const report = await entryPersistanceService.loadRecipe(rootId)
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
    loadRecipe,
    createSocket,
    releaseSocket
  }
}
