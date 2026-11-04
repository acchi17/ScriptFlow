<template>
  <div class="main-area">
    <div class="main-content" :class="{ 'executing': isExecuting }">
      <div class="tab-bar">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: tab.id === activeTabId }"
          :data-tab-id="tab.id"
          @click="onTabClick(tab)"
        >
          <span class="tab-label" :title="tab.label">{{ tab.label }}</span>
          <button class="tab-close-btn" title="Close Tab" @click.stop="onCloseTab(tab)"></button>
        </div>
        <button
          class="tab-add-btn"
          title="New Tab"
          :disabled="isTabLimitReached"
          @click="onAddTab"
        ></button>
      </div>
      <div class="tab-content">
        <RecipeItem
          v-for="tab in visibleTabs"
          :key="tab.rootEntryId"
          class="tab-pane"
          :entry-id="tab.rootEntryId"
        />
        <div v-if="visibleTabs.length === 0" class="tab-empty-state">
          {{ emptyStateMessage }}
        </div>
      </div>
      <div v-show="showLog" class="log-popup">
        <ExecutionLogView />
      </div>
    </div>
  </div>
</template>

<script>
import { inject } from 'vue'
import { storeToRefs } from 'pinia'
import RecipeItem from './RecipeItem.vue'
import ExecutionLogView from './ExecutionLogView.vue'
import { useSystemState } from '../composables/useSystemState'
import { useTabStore } from '../stores/useTabStore'

const EMPTY_STATE_MESSAGE = 'Click + or Load to create a tab.'

export default {
  name: 'MainArea',
  components: {
    RecipeItem,
    ExecutionLogView
  },
  setup() {
    const { isExecuting, showLog } = useSystemState()
    const entryManager = inject('entryManager')
    const tabStore = useTabStore()
    const { tabs, activeTabId, visibleTabs, isTabLimitReached } = storeToRefs(tabStore)

    // Start with one empty tab.
    tabStore.createTab()

    function onTabClick(tab) {
      tabStore.setActiveTab(tab.id)
    }

    function onAddTab() {
      tabStore.createTab()
    }

    // Asks for confirmation only when the tab holds entries; an empty tab closes at once.
    async function onCloseTab(tab) {
      if (entryManager.getChildren(tab.rootEntryId).length > 0) {
        const confirmed = window.confirm('Closing this tab discards its recipe. Continue?')
        if (!confirmed) return
      }
      await tabStore.closeTab(tab.id)
    }

    return {
      isExecuting,
      showLog,
      tabs,
      activeTabId,
      visibleTabs,
      isTabLimitReached,
      emptyStateMessage: EMPTY_STATE_MESSAGE,
      onTabClick,
      onAddTab,
      onCloseTab
    }
  }
}
</script>

<style scoped>
.main-area {
  height: calc(100vh - var(--menu-bar-height));
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg-color);
}

.main-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-content.executing {
  pointer-events: none;
  opacity: 0.5;
}

.tab-bar {
  height: var(--main-tab-bar-height);
  padding: 0 8px;
  display: flex;
  align-items: flex-end;
  border-bottom: var(--main-tab-border);
}

/* Tabs shrink (down to min-width) so that MAX_TABS tabs fit in the bar. */
.tab {
  height: calc(var(--main-tab-bar-height) - 6px);
  flex: 0 1 200px;
  min-width: 80px;
  max-width: 240px;
  padding: 0 4px 0 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 12px 12px 0 0;
  background-color: var(--main-bg-color);
  cursor: pointer;
}

.tab:not(.active):hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tab.active {
  margin-bottom: -1px;
  border: var(--main-tab-border);
  border-bottom: 1px solid var(--recipe-bg-color);
  background-color: var(--recipe-bg-color);
}

.tab-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--main-tab-font-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close-btn,
.tab-add-btn {
  flex: none;
  padding: 0;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
}

.tab-close-btn {
  width: 16px;
  height: 16px;
  background-image: var(--close-icon-image);
}

.tab-add-btn {
  width: 20px;
  height: 20px;
  margin: 0 0 5px 6px;
  background-image: var(--plus-icon-image);
}

.tab-close-btn:hover,
.tab-add-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.tab-add-btn:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}

.tab-content {
  height: calc(100% - var(--main-tab-bar-height));
  display: flex;
  flex-direction: row;
}

.tab-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.tab-empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--main-tab-font-color);
  background-color: var(--recipe-bg-color);
}

.log-popup {
  position: absolute;
  top: -1px;
  right: 0;
  bottom: 0;
  z-index: 10;
  border: var(--base-outline-border);
  background-color: var(--popup-bg-color);
}
</style>
