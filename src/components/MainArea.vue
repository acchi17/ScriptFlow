<template>
  <div class="main-area">
    <div class="top-spacer">
      <button class="log-toggle-btn"
              :title="showLog ? 'Hide Log' : 'Show Log'"
              @click="showLog = !showLog">
        {{ showLog ? '»' : '«' }}
      </button>
    </div>
    <div class="main-content" :class="{ 'executing': isExecuting }">
      <div class="tab-bar">
        <div class="tab active">
          <span class="tab-label">Recipe</span>
        </div>
      </div>
      <RecipeItem class="tab-content" />
      <div v-show="showLog" class="log-popup">
        <ExecutionLogView />
      </div>
    </div>
  </div>
</template>

<script>
import RecipeItem from './RecipeItem.vue'
import ExecutionLogView from './ExecutionLogView.vue'
import { useSystemState } from '../composables/useSystemState'

export default {
  name: 'MainArea',
  components: {
    RecipeItem,
    ExecutionLogView
  },
  setup() {
    const { isExecuting } = useSystemState()
    return { isExecuting }
  },
  data() {
    return {
      showLog: false
    }
  }
}
</script>

<style scoped>
.main-area {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--main-bg-color);
}

.top-spacer {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.main-content {
  position: relative;
  height: calc(100% - 24px);
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
}

.log-toggle-btn {
  width: 20px;
  height: 20px;
  font-size: 14px;
  color: #555;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.log-toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
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
