import { inject } from 'vue';
import { useSystemState } from './useSystemState'

/**
 * Provides entry execution functionality as a composable function
 * @return {Object} Object containing executeEntry function and reactive state
 */
export function useEntryExecution() {
  const entryExecutionService = inject('entryExecutionService');
  const { setExecuting } = useSystemState()

  /**
   * Execute an entry (Block or Container)
   * @param {string} entryId Id of the entry to execute
   */
  const executeEntry = async (entryId) => {
    if (!entryId) return;

    setExecuting(true, entryId);
    try {
      await entryExecutionService.executeEntry(entryId);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      setExecuting(false);
    }
  };

  return {
    executeEntry
  };
}
