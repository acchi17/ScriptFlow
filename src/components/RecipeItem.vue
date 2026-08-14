<template>
  <div
    class="recipe-item"
  >
    <div class="recipe-content">
      <div class="recipe-header">
        <button class="recipe-btn recipe-run-btn" title="Run" :disabled="isExecuting || isBusy" @click.stop="executeRecipe"></button>
        <button
          class="recipe-btn recipe-com-btn"
          :class="{
            'recipe-com-btn--connected': commBtnStatus === 'connected',
            'recipe-com-btn--failed':    commBtnStatus === 'failed'
          }"
          title="Communication Setting"
          @click.stop="openComSetting"
        ></button>
        <button class="recipe-btn recipe-clear-btn" title="Clear" :disabled="isExecuting || isBusy" @click.stop="clearRecipe"></button>
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
              :entry-id="rootContainerId"
            />
            <div class="bottom-spacer" />
          </div>
        </div>
        <div class="connection-panel">
          <ConnectionView />
        </div>
      </div>
    </div>
    <CommSettingView
      v-if="showCommSetting"
      :entryId="rootContainerId"
      @close="onCommSettingClose"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useEntryExecution } from '../composables/useEntryExecution'
import { useEntryPersistance } from '../composables/useEntryPersistance'
import { useSystemState } from '../composables/useSystemState'
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
    const { addEntry, clearContainer, trackEntryLayout } = useEntryOperation()
    const { executeEntry } = useEntryExecution()
    const { isExecuting } = useSystemState()
    const { isBusy } = useEntryPersistance()

    const rootContainerId = addEntry('container', null, 'root-container', 0)

    const executeRecipe = () => {
      executeEntry(rootContainerId)
    }

    const clearRecipe = () => {
      clearContainer(rootContainerId)
    }

    const showCommSetting = ref(false)
    const commBtnStatus = ref('none')

    const openComSetting = () => {
      showCommSetting.value = true
    }

    const onCommSettingClose = (connected) => {
      showCommSetting.value = false
      if (connected === true)       commBtnStatus.value = 'connected'
      else if (connected === false) commBtnStatus.value = 'failed'
      else                          commBtnStatus.value = 'none'
    }

    const entryPanelRef = ref(null)
    const entryLayoutMap = trackEntryLayout(entryPanelRef)

    return {
      rootContainerId,
      executeRecipe,
      clearRecipe,
      openComSetting,
      showCommSetting,
      commBtnStatus,
      onCommSettingClose,
      entryPanelRef,
      entryLayoutMap,
      isExecuting,
      isBusy
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
