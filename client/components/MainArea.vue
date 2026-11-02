<template>
  <div class="main-area">
    <div class="main-content" :class="{ 'executing': isExecuting }">
      <div class="tab-bar">
        <div class="tab active">
          <span class="tab-label">Recipe</span>
        </div>
      </div>
      <div class="tab-content">
        <RecipeItem
          v-for="tab in visibleTabs"
          :key="tab.rootEntryId"
          class="tab-pane"
          :entry-id="tab.rootEntryId"
        />
      </div>
      <div v-show="showLog" class="log-popup">
        <ExecutionLogView />
      </div>
    </div>
  </div>
</template>

<script>
import { storeToRefs } from 'pinia'
import RecipeItem from './RecipeItem.vue'
import ExecutionLogView from './ExecutionLogView.vue'
import { useSystemState } from '../composables/useSystemState'
import { useTabStore } from '../stores/useTabStore'

export default {
  name: 'MainArea',
  components: {
    RecipeItem,
    ExecutionLogView
  },
  setup() {
    const { isExecuting, showLog } = useSystemState()
    const tabStore = useTabStore()
    const { visibleTabs } = storeToRefs(tabStore)

    // Start with one empty tab, as before multi-tab support.
    tabStore.createTab()

    return { isExecuting, showLog, visibleTabs }
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

.tab {
  height: calc(var(--main-tab-bar-height) - 6px);
  min-width: 160px;
  max-width: 240px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  border-radius: 12px 12px 0 0;
  background-color: var(--main-bg-color);
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
