<template>
  <div class="menu-area">
    <div class="menu-left">
      <button class="menu-btn menu-load-btn" title="Load" :disabled="isExecuting" @click.stop="onLoadRecipe"></button>
      <button class="menu-btn menu-save-btn" title="Save" :disabled="isExecuting" @click.stop="onSaveRecipe"></button>
    </div>
    <div class="menu-right">
      <div class="rect-item">
        <div
          class="rect-icon plain-container"
          draggable="true"
          data-entry-name="Container"
          @dragstart="onDragStartContainer"
          @dragend="onDragEndContainer"
        ></div>
      </div>
      <div class="rect-item">
        <div
          class="rect-icon if-container"
          draggable="true"
          data-entry-name="if-container"
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
import { inject } from 'vue'
import { useDraggable } from '../composables/useDraggable'
import { useSystemState } from '../composables/useSystemState'
import { useEntryOperation } from '../composables/useEntryOperation'

export default {
  name: 'MenuArea',
  setup() {
    const { onDragStart: onDragStartContainer, onDragEnd: onDragEndContainer, setOnDragStartCallback } = useDraggable()
    setOnDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'container')
      event.dataTransfer.setData('entryName', event.currentTarget.dataset.entryName)
      event.dataTransfer.setData('sourceId', undefined)
    })
    const { showLog, toggleLog, isExecuting, lastError } = useSystemState()
    const entryManager = inject('entryManager')
    const { lastReport, saveRecipe, loadRecipe } = useEntryOperation()

    const onSaveRecipe = async () => {
      await saveRecipe()
      if (lastError.value) {
        window.alert(`Failed to save recipe: ${lastError.value}`)
      }
    }

    const onLoadRecipe = async () => {
      const rootEntryId = entryManager.getRoot()
      if (rootEntryId && entryManager.getChildren(rootEntryId).length > 0) {
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
.rect-icon.plain-container {
  background-color: #8eec9a;
  border: 1px solid #7bc97b;
}
.rect-icon.if-container {
  background-color: #ffd8b0;
  border: 1px solid #f0a860;
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
