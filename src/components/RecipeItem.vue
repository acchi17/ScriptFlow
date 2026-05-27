<template>
  <div
    class="recipe-item"
  >
    <div class="recipe-content">
      <div class="recipe-header">
        <button class="recipe-btn recipe-run-btn" title="Run" @click.stop="executeRecipe"></button>
        <button class="recipe-btn recipe-com-btn" title="Communication Setting" @click.stop="openComSetting"></button>
        <button class="recipe-btn recipe-clear-btn" title="Clear" @click.stop="clearRecipe"></button>
      </div>
      <div class="recipe-panel">
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
              :entry="mainContainer"
            />
            <div class="bottom-spacer" />
          </div>
        </div>
        <div class="connection-panel">
          <ConnectionView />
        </div>
      </div>
    </div>
    <CommSettingView v-if="showCommSetting" @close="showCommSetting = false" />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useEntryRect } from '../composables/useEntryRect'
import { useEntryExecution } from '../composables/useEntryExecution'
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

  setup() {
    const { addContainer, clearContainer } = useEntryOperation()
    const { executeEntry } = useEntryExecution()

    const mainContainer = addContainer(null, 'root-container', 0)

    const executeRecipe = () => {
      executeEntry(mainContainer)
    }

    const clearRecipe = () => {
      clearContainer(mainContainer.id)
    }

    const showCommSetting = ref(false)

    const openComSetting = () => {
      showCommSetting.value = true
    }

    const entryPanelRef = ref(null)
    const entryLayoutMap = useEntryRect(entryPanelRef)

    return {
      mainContainer,
      executeRecipe,
      clearRecipe,
      openComSetting,
      showCommSetting,
      entryPanelRef,
      entryLayoutMap
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
  height: 300px;
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
</style>
