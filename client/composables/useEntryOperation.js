import { ref, inject } from 'vue'
import { useSystemState } from './useSystemState'
import { useTabStore, labelFromFileName } from '../stores/useTabStore'

const lastReport = ref(null)

/**
 * Vue-side glue for EntryExecutionService and EntryPersistanceService: executing
 * entries, saving/loading recipes, and the last load report. Busy/error state is
 * shared with useSystemState (isExecuting/lastError).
 */
export function useEntryOperation() {
  const entryExecutionService = inject('entryExecutionService')
  const entryPersistanceService = inject('entryPersistanceService')
  const { setExecuting, setError, clearError } = useSystemState()

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
   * Save the recipe of the given root. The tab's label is suggested as the file
   * name; on success the tab's label becomes the saved file name (without extension).
   * @param {string} rootId - ID of the root entry to save
   */
  const saveRecipe = async (rootId) => {
    const tabStore = useTabStore()
    setExecuting(true)
    clearError()
    try {
      const tab = tabStore.getTabByRootId(rootId)
      const savedName = await entryPersistanceService.saveRecipe(rootId, tab?.label)
      tabStore.setTabLabelFromFileName(rootId, savedName)
    } catch (error) {
      setError(error.message)
    } finally {
      setExecuting(false)
    }
  }

  /**
   * Let the user pick a recipe file and load it into a newly created tab.
   * @returns {Promise<boolean>} true if a recipe was actually loaded (false if canceled or failed)
   */
  const loadRecipe = async () => {
    const tabStore = useTabStore()
    setExecuting(true)
    clearError()
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
