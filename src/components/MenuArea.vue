<template>
  <div class="menu-area">
    <div class="menu-left">
      <button class="menu-btn menu-load-btn" title="Load" :disabled="isExecuting || isBusy" @click.stop="onLoadRecipe"></button>
      <button class="menu-btn menu-save-btn" title="Save" :disabled="isExecuting || isBusy" @click.stop="onSaveRecipe"></button>
    </div>
    <div class="menu-right">
      <div class="rect-item">
        <div
          class="rect-icon lime"
          draggable="true"
          @dragstart="onDragStartContainer"
          @dragend="onDragEndContainer"
        ></div>
      </div>
      <button class="log-toggle-btn"
              :title="showLog ? 'Hide Log' : 'Show Log'"
              @click="toggleLog">
        {{ showLog ? '»' : '«' }}
      </button>
    </div>
  </div>
</template>

<script>
import { useDraggable } from '../composables/useDraggable'
import { useSystemState } from '../composables/useSystemState'
import { useEntryOperation } from '../composables/useEntryOperation'
import { useEntryPersistance } from '../composables/useEntryPersistance'

export default {
  name: 'MenuArea',
  setup() {
    const { onDragStart: onDragStartContainer, onDragEnd: onDragEndContainer, setOnDragStartCallback } = useDraggable()
    setOnDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'container')
      event.dataTransfer.setData('entryName', 'Container')
      event.dataTransfer.setData('sourceId', undefined)
    })
    const { showLog, toggleLog, isExecuting } = useSystemState()
    const { getRootEntryId, getChildren } = useEntryOperation()
    const { isBusy, lastError, lastReport, saveRecipe, loadRecipe } = useEntryPersistance()

    const onSaveRecipe = async () => {
      await saveRecipe()
      if (lastError.value) {
        window.alert(`Failed to save recipe: ${lastError.value}`)
      }
    }

    const onLoadRecipe = async () => {
      const rootEntryId = getRootEntryId()
      if (rootEntryId && getChildren(rootEntryId).length > 0) {
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

    return {
      onDragStartContainer,
      onDragEndContainer,
      showLog,
      toggleLog,
      isExecuting,
      isBusy,
      onSaveRecipe,
      onLoadRecipe
    }
  }
}
</script>

<style scoped>
.menu-area {
  height: var(--menu-bar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 0 12px;
  border-top: var(--base-outline-border);
  border-bottom: var(--base-outline-border);
  background-color: var(--main-bg-color);
}
.menu-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.menu-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: var(--base-outline-border);
  border-radius: 4px;
  background-color: transparent;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  cursor: pointer;
  padding: 0;
}
.menu-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
.menu-btn:disabled {
  opacity: 0.4;
  cursor: default;
  pointer-events: none;
}
.menu-save-btn {
  background-image: var(--save-icon-image);
}
.menu-load-btn {
  background-image: var(--load-icon-image);
}
.rect-item {
  width: 36px;
  height: 36px;
}
.rect-icon {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: grab;
}
.rect-icon.lime {
  background-color: #8eec9a;
  border: 1px solid #7bc97b;
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
</style>
