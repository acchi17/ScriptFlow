<template>
  <div class="menu-area">
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
</template>

<script>
import { useDraggable } from '../composables/useDraggable'
import { useSystemState } from '../composables/useSystemState'

export default {
  name: 'MenuArea',
  setup() {
    const { onDragStart: onDragStartContainer, onDragEnd: onDragEndContainer, setOnDragStartCallback } = useDraggable()
    setOnDragStartCallback((event) => {
      event.dataTransfer.setData('entryType', 'container')
      event.dataTransfer.setData('entryName', 'Container')
      event.dataTransfer.setData('sourceId', undefined)
    })
    const { showLog, toggleLog } = useSystemState()
    return { onDragStartContainer, onDragEndContainer, showLog, toggleLog }
  }
}
</script>

<style scoped>
.menu-area {
  height: var(--menu-bar-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 4px;
  gap: 8px;
  border-top: var(--base-outline-border);
  border-bottom: var(--base-outline-border);
  background-color: var(--main-bg-color);
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
