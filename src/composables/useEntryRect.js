import { watch, nextTick, inject } from 'vue'

/**
 * Measures the Y position and height of each entry's header element in the entry panel
 * and writes them into EntryLayoutManager. Used to align horizontal lines in the
 * connection panel with entry headers.
 *
 * @param {Ref<HTMLElement>} entryPanelRef - Ref to the entry panel (.entry-panel)
 */
export function useEntryRect(entryPanelRef) {
  const entryLayoutManager = inject('entryLayoutManager')
  const entryManager = inject('entryManager')

  function measureEntries() {
    if (!entryPanelRef.value) return

    const panelRect = entryPanelRef.value.getBoundingClientRect()

    const nodes = entryPanelRef.value.querySelectorAll('[data-entry-id]')
    entryLayoutManager.clearAll()
    for (const node of nodes) {
      const rect = node.getBoundingClientRect()
      entryLayoutManager.setLayout(
        node.dataset.entryId,
        rect.top - panelRect.top,
        rect.height
      )
    }
  }

  // Re-measure on structural changes (add/remove/reorder entries)
  watch(() => entryManager.updateTick.value, () => nextTick(() => measureEntries()))

  return entryLayoutManager.layoutMap
}
