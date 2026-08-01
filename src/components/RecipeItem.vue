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
        <button class="recipe-btn recipe-text-btn recipe-save-btn" title="Save" :disabled="isExecuting || isBusy" @click.stop="onSaveRecipe">Save</button>
        <button class="recipe-btn recipe-text-btn recipe-load-btn" title="Load" :disabled="isExecuting || isBusy" @click.stop="onLoadRecipe">Load</button>
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
    <CommSettingView
      v-if="showCommSetting"
      :entryId="mainContainer.id"
      @close="onCommSettingClose"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useEntryLayout } from '../composables/useEntryLayout'
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
    const { addContainer, clearContainer } = useEntryOperation()
    const { executeEntry } = useEntryExecution()
    const { isExecuting } = useSystemState()
    const { isBusy, lastError, lastReport, saveRecipe, loadRecipe } = useEntryPersistance()

    const mainContainer = addContainer(null, 'root-container', 0)

    const executeRecipe = () => {
      executeEntry(mainContainer)
    }

    const clearRecipe = () => {
      clearContainer(mainContainer.id)
    }

    const onSaveRecipe = async () => {
      await saveRecipe()
      if (lastError.value) {
        window.alert(`Failed to save recipe: ${lastError.value}`)
      }
    }

    const onLoadRecipe = async () => {
      if (mainContainer.children.length > 0) {
        const confirmed = window.confirm('Loading a recipe replaces the current one. Continue?')
        if (!confirmed) return
      }
      await loadRecipe()
      if (lastError.value) {
        window.alert(`Failed to load recipe: ${lastError.value}`)
      } else if (lastReport.value?.warnings?.length) {
        console.warn('Recipe loaded with warnings:', lastReport.value.warnings)
      }
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
    const entryLayoutMap = useEntryLayout(entryPanelRef)

    return {
      mainContainer,
      executeRecipe,
      clearRecipe,
      openComSetting,
      showCommSetting,
      commBtnStatus,
      onCommSettingClose,
      entryPanelRef,
      entryLayoutMap,
      isExecuting,
      isBusy,
      onSaveRecipe,
      onLoadRecipe
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

.recipe-text-btn {
  width: auto;
  padding: 0 8px;
  font-size: 12px;
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
