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
  </div>
</template>

<script>
import { useDraggable } from '../composables/useDraggable'

export default {
  name: 'MenuArea',
  setup() {
    const { onDragStart: onDragStartContainer, onDragEnd: onDragEndContainer, setOnDragStartCallBack } = useDraggable()
    setOnDragStartCallBack((event) => {
      event.dataTransfer.setData('entryType', 'container')
      event.dataTransfer.setData('entryName', 'Container')
      event.dataTransfer.setData('sourceId', undefined)
    })
    return { onDragStartContainer, onDragEndContainer }
  }
}
</script>

<style scoped>
.menu-area {
  height: var(--menu-bar-height);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
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
</style>
