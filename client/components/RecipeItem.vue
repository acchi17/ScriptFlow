<template>
  <div
    class="recipe-item"
  >
    <div class="recipe-content">
      <div class="recipe-header">
        <button class="recipe-btn recipe-run-btn" title="Run" :disabled="isExecuting" @click.stop="executeRecipe"></button>
        <button
          class="recipe-btn recipe-com-btn"
          :class="{
            'recipe-com-btn--connected': commBtnStatus === 'connected',
            'recipe-com-btn--failed':    commBtnStatus === 'failed'
          }"
          title="Communication Setting"
          @click.stop="openComSetting"
        ></button>
        <button class="recipe-btn recipe-clear-btn" title="Clear" :disabled="isExecuting" @click.stop="clearRecipe"></button>
      </div>
      <div class="recipe-panel" ref="recipePanelRef" @dragover="onPanelDragOver">
        <div class="background-panel">
          <div
            v-for="[id, rect] in entryLayoutMap"
            :key="id"
            class="background-line"
            :style="{ top: rect.y + rect.height / 2 + 'px' }"
          />
        </div>
        <div class="entry-panel" ref="entryPanelRef">
          <div class="main-container">
            <ContainerChildren
              :entry-id="entryId"
            />
            <div class="bottom-spacer" />
          </div>
        </div>
        <div class="connection-panel">
          <ConnectionView :entry-id="entryId" />
        </div>
      </div>
    </div>
    <CommSettingView
      v-if="showCommSetting"
      :entryId="entryId"
      @close="onCommSettingClose"
    />
  </div>
</template>

<script>
import { ref, computed, inject, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useSystemState } from '../composables/useSystemState'
import { useAutoScroll } from '../composables/useAutoScroll'
import { useTabStore } from '../stores/useTabStore'
import ConnectionView from './ConnectionView.vue'
import ContainerChildren from './ContainerChildren.vue'
import CommSettingView from './CommSettingView.vue'

export default {
  name: 'RecipeItem',
  components: {
    ConnectionView,
    ContainerChildren,
    CommSettingView,
  },

  props: {
    entryId: { type: String, required: true }
  },

  setup(props) {
    const entryManager = inject('entryManager')
    const entryExecutionService = inject('entryExecutionService')
    const { isExecuting, execute } = useEntryOperation()
    const { cancelConnection, getSelectedEntryId, clearSelection } = useSystemState()

    const clearRecipe = () => {
      entryManager.clearEntries(props.entryId)
    }

    const executeRecipe = () => {
      execute(() => entryExecutionService.executeEntry(props.entryId))
    }

    const showCommSetting = ref(false)
    // The comm status lives in this root's tab (found by entryId, never the active tab),
    // so it survives remounts.
    const tabStore = useTabStore()
    const commBtnStatus = computed(() => tabStore.getTabByRootId(props.entryId)?.commStatus ?? 'none')

    const openComSetting = () => {
      showCommSetting.value = true
    }

    const onCommSettingClose = (connected) => {
      showCommSetting.value = false
      let status = 'none'
      if (connected === true)       status = 'connected'
      else if (connected === false) status = 'failed'
      tabStore.setCommStatus(props.entryId, status)
    }

    const entryPanelRef = ref(null)
    const recipePanelRef = ref(null)
    const { onDragOver: onPanelDragOver } = useAutoScroll(recipePanelRef)

    // Re-measures the Y position and height of every entry's header element on
    // structural changes, so the connection panel can align lines with entry headers.
    function measureEntries() {
      if (!entryPanelRef.value) return

      const panelRect = entryPanelRef.value.getBoundingClientRect()

      const nodes = entryPanelRef.value.querySelectorAll('[data-entry-id]')
      entryManager.clearLayouts(props.entryId)
      for (const node of nodes) {
        const rect = node.getBoundingClientRect()
        entryManager.addLayout(
          node.dataset.entryId,
          rect.top - panelRect.top,
          rect.height
        )
      }
    }

    // Ticks are read with ?. since the root (and its ticks) may be removed before this
    // component unmounts (e.g. when its tab is closed).
    watch(() => entryManager.getHierarchyTick(props.entryId)?.value, () => {
      cancelConnection()
      const id = getSelectedEntryId.value
      if (id && !entryManager.isAlive(id)) {
        clearSelection()
      }
      nextTick(() => measureEntries())
    })

    // The scroll position is kept in this root's tab (found by entryId, never the active
    // tab): saved once on unmount (not on every scroll event) and restored on mount.
    // Restoring does not wait for measureEntries().
    onMounted(() => {
      nextTick(() => {
        if (!recipePanelRef.value) return
        recipePanelRef.value.scrollTop = tabStore.getTabByRootId(props.entryId)?.scrollTop ?? 0
      })
    })

    // When the tab has already been removed (closeTab()), setScrollTop() does nothing.
    onBeforeUnmount(() => {
      if (!recipePanelRef.value) return
      tabStore.setScrollTop(props.entryId, recipePanelRef.value.scrollTop)
    })

    const entryLayoutMap = computed(() => {
      entryManager.getLayoutsTick(props.entryId)?.value
      if (!entryManager.isRoot(props.entryId)) return []
      return entryManager.getAllLayouts(props.entryId)
    })

    return {
      executeRecipe,
      clearRecipe,
      openComSetting,
      showCommSetting,
      commBtnStatus,
      onCommSettingClose,
      entryPanelRef,
      recipePanelRef,
      onPanelDragOver,
      entryLayoutMap,
      isExecuting
    }
  }
}
</script>

<style scoped>
.recipe-item {
  background-color: var(--recipe-bg-color);
}

.recipe-content {
  height: 100%;
  padding: 0 10px;
  display: flex;
  flex-direction: column;
}

.recipe-header {
  height: 36px;
  padding: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.recipe-panel {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: row;
  overflow-y: auto;  
}

.background-panel {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.background-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background-color: var(--recipe-bg-line-color);
  pointer-events: none;
}

.entry-panel {
  position: relative;
  z-index: 1;
  flex: 7;
}

.connection-panel {
  position: relative;
  z-index: 1;
  flex: 3;
}

.main-container {
  width: fit-content;
  min-width: 200px;
  padding: 20px;
}

.bottom-spacer {
  height: 200px;
}

.recipe-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  padding: 0;
}

.recipe-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.recipe-btn:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.recipe-run-btn {
  background-image: var(--play-icon-image);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.recipe-com-btn {
  background-image: var(--comm-icon-image);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.recipe-clear-btn {
  background-image: var(--trash-icon-image);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.recipe-com-btn--connected {
  background-color: #4caf50;
}

.recipe-com-btn--failed {
  background-color: #f44336;
}
</style>
