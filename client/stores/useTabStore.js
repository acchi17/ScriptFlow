import { ref, computed, inject } from 'vue'
import { defineStore } from 'pinia'
import { useSystemState } from '../composables/useSystemState'

export const MAX_TABS = 10

/**
 * Turn a file name or full path (either `/` or `\` separated) into a tab label:
 * the last path segment without its extension. A name that is only a leading-dot
 * extension (e.g. `.json`) is kept as is.
 * @param {string} [fileName]
 * @returns {string|undefined} undefined if no name is given (createTab() then falls back to `Recipe N`)
 */
export function labelFromFileName(fileName) {
  if (!fileName) return undefined
  const baseName = fileName.split(/[\\/]/).pop()
  const dot = baseName.lastIndexOf('.')
  return dot > 0 ? baseName.slice(0, dot) : baseName
}

/**
 * Store of the MainArea tabs. Each tab owns one root entry (rootEntryId) in the ECS.
 * Root entries for tabs must be created / removed only through createTab() / closeTab()
 * so that `tabs` and the ECS roots stay consistent.
 */
export const useTabStore = defineStore('tab', () => {
  const entryManager = inject('entryManager')
  const entryExecutionService = inject('entryExecutionService')
  const entryPersistanceService = inject('entryPersistanceService')
  const executionLogService = inject('executionLogService')
  const { resetState } = useSystemState()

  // state
  const tabs = ref([])            // [{ id, label, rootEntryId, commStatus, scrollTop }]
  const activeTabId = ref(null)
  const nextTabNumber = ref(1)    // sequence number for default labels; never reused
  let nextTabIdNumber = 1         // sequence number for tab ids; independent of labels
  // Activation history: tab ids, most recently activated first, each id at most once.
  // Kept in memory only (never persisted) and not exposed from the store.
  const activationHistory = []

  // getters
  const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value) ?? null)
  const visibleTabs = computed(() => activeTab.value ? [activeTab.value] : [])
  const isTabLimitReached = computed(() => tabs.value.length >= MAX_TABS)

  // actions

  /**
   * Creates a tab with a new root entry and makes it active. Does not create a socket.
   *
   * @param {string} [label] defaults to `Recipe N`
   * @returns {object|null} the created tab, or null if the tab limit is reached
   */
  function createTab(label) {
    if (isTabLimitReached.value) return null

    const rootEntryId = entryManager.addEntry('container', 'root-container')
    entryManager.moveEntry(rootEntryId, null, 0)
    entryManager.setComm(rootEntryId)

    tabs.value.push({
      id: `tab-${nextTabIdNumber++}`,
      label: label ?? `Recipe ${nextTabNumber.value++}`,
      rootEntryId,
      commStatus: 'none',
      scrollTop: 0
    })
    const tab = tabs.value[tabs.value.length - 1]
    setActiveTab(tab.id)
    return tab
  }

  /**
   * Closes a tab: releases its socket and script-runner, removes its root entry,
   * discards its execution log tree (ExecutionLogService.removeLogs()), and removes the tab
   * (also from the activation history). Host-side failures are logged and do not prevent
   * the tab from closing. Never asks for confirmation.
   *
   * If the closed tab is still the active tab once the host-side cleanup has finished, the
   * most recently activated remaining tab becomes active. As a safety net, if no remaining
   * tab is in the history, tabs[0] becomes active; if no tab remains, no tab is active.
   *
   * @param {string} tabId
   * @returns {Promise<void>}
   */
  async function closeTab(tabId) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return
    const rootId = tab.rootEntryId

    try {
      await entryExecutionService.deleteComm(rootId)
    } catch (e) {
      console.error(`Failed to delete the socket of ${rootId}:`, e)
    }
    try {
      await entryExecutionService.shutdownRunner(rootId)
    } catch (e) {
      console.error(`Failed to shut down the script-runner of ${rootId}:`, e)
    }

    // From here on, no await: the root removal and the tab removal must happen
    // without a render in between.
    const index = tabs.value.findIndex(t => t.id === tabId)
    if (index === -1) return
    entryManager.removeEntry(rootId)
    executionLogService.removeLogs(rootId)
    tabs.value.splice(index, 1)
    removeFromHistory(tabId)
    if (activeTabId.value === tabId) {
      setActiveTab(findNextActiveTabId())
    }
  }

  function removeFromHistory(tabId) {
    const i = activationHistory.indexOf(tabId)
    if (i !== -1) activationHistory.splice(i, 1)
  }

  /**
   * @returns {string|null} the most recently activated tab that still exists, else
   *   tabs[0] (safety net), else null
   */
  function findNextActiveTabId() {
    const next = activationHistory.find(id => tabs.value.some(t => t.id === id))
    return next ?? tabs.value[0]?.id ?? null
  }

  /**
   * Makes the given tab active and clears the selection / connecting state.
   * Does nothing if the tab is already active. A non-null id is moved to the front of
   * the activation history (used by closeTab() to pick the next active tab).
   * @param {string|null} tabId
   */
  function setActiveTab(tabId) {
    if (activeTabId.value === tabId) return
    if (tabId !== null) {
      removeFromHistory(tabId)
      activationHistory.unshift(tabId)
    }
    activeTabId.value = tabId
    resetState()
  }

  function getTabByRootId(rootId) {
    return tabs.value.find(t => t.rootEntryId === rootId) ?? null
  }

  function setCommStatus(rootId, status) {
    const tab = getTabByRootId(rootId)
    if (tab) tab.commStatus = status
  }

  function setTabLabel(rootId, label) {
    const tab = getTabByRootId(rootId)
    if (tab) tab.label = label
  }

  /**
   * Sets the tab's label from a saved/loaded file name (see labelFromFileName()).
   * Does nothing if no file name is given (e.g. the user canceled the save).
   * @param {string} rootId
   * @param {string} [fileName]
   */
  function setTabLabelFromFileName(rootId, fileName) {
    const label = labelFromFileName(fileName)
    if (label) setTabLabel(rootId, label)
  }

  function setScrollTop(rootId, scrollTop) {
    const tab = getTabByRootId(rootId)
    if (tab) tab.scrollTop = scrollTop
  }

  /**
   * Saves the tab's recipe. The tab's label is suggested as the file name; on success
   * the tab's label becomes the saved file name (without extension).
   * Errors from the save are passed through to the caller.
   *
   * @param {string} tabId
   * @returns {Promise<string|null>} the saved file name/path, or null if the tab does not
   *   exist or the user canceled
   */
  async function saveTab(tabId) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (!tab) return null
    const savedName = await entryPersistanceService.saveRecipe(tab.rootEntryId, tab.label)
    setTabLabelFromFileName(tab.rootEntryId, savedName)
    return savedName ?? null
  }

  /**
   * Lets the user pick a recipe file and restores it into a newly created (and active) tab
   * labeled with the file name. If restoring fails, the created tab is closed so that no
   * partially restored recipe is left behind, and the error is rethrown. Closing it makes
   * the tab that was active before the Load active again (see closeTab()).
   *
   * @returns {Promise<object|null>} the restore report, or null if the user canceled
   * @throws {Error} if no more tabs can be created, or if picking/restoring fails
   */
  async function openRecipeInNewTab() {
    const picked = await entryPersistanceService.pickRecipe()
    if (!picked) return null

    const tab = createTab(labelFromFileName(picked.fileName))
    if (!tab) throw new Error('Cannot open more tabs.')

    try {
      return await entryPersistanceService.restoreRecipe(picked.data, tab.rootEntryId)
    } catch (e) {
      await closeTab(tab.id)
      throw e
    }
  }

  return {
    tabs,
    activeTabId,
    nextTabNumber,
    activeTab,
    visibleTabs,
    isTabLimitReached,
    createTab,
    closeTab,
    setActiveTab,
    getTabByRootId,
    setCommStatus,
    setTabLabel,
    setTabLabelFromFileName,
    setScrollTop,
    saveTab,
    openRecipeInNewTab
  }
})
