<template>
  <div class="panel">
    <div class="panel-header">{{ title }}</div>
    <div class="panel-body">
      <div
        v-for="item in items"
        :key="item"
        class="panel-row"
        :class="{ selected: selectedItem === item }"
        @click.stop="$emit('update:selected-item', item)"
      >
        <input
          v-if="editingItem === item"
          class="rename-input"
          v-model="editingValue"
          @keydown.enter.stop="commitEdit"
          @keydown.escape.stop="cancelEdit"
          @blur="commitEdit"
          @click.stop
        />
        <template v-else>{{ item }}</template>
      </div>
    </div>
    <div class="toolbar">
      <div class="toolbar-left">
        <button
          class="tool-btn up-btn"
          :class="{ disabled: !selectedItem || isFirst(selectedItem) }"
          @click.stop="$emit('move-up', selectedItem)"
        ></button>
        <button
          class="tool-btn down-btn"
          :class="{ disabled: !selectedItem || isLast(selectedItem) }"
          @click.stop="$emit('move-down', selectedItem)"
        ></button>
        <button class="tool-btn add-btn" @click.stop="$emit('add', addMiddleIndex())"></button>
        <button class="tool-btn add-top-btn" @click.stop="$emit('add', 0)"></button>
        <button class="tool-btn add-bottom-btn" @click.stop="$emit('add', items.length)"></button>
        <button
          class="tool-btn rename-btn"
          :class="{ disabled: !selectedItem }"
          @click.stop="startEditing"
        ></button>
      </div>
      <button
        class="tool-btn delete-btn"
        :class="{ disabled: !selectedItem }"
        @click.stop="$emit('delete', selectedItem)"
      ></button>
    </div>
  </div>
</template>

<script>
import { ref, nextTick } from 'vue';

export default {
  name: 'SettingListItem',
  props: {
    title: { type: String, required: true },
    items: { type: Array, required: true },
    selectedItem: { type: String, default: null },
  },
  emits: ['update:selected-item', 'move-up', 'move-down', 'add', 'delete', 'rename'],
  setup(props, { emit }) {
    function isFirst(item) {
      return props.items[0] === item;
    }
    function isLast(item) {
      return props.items[props.items.length - 1] === item;
    }
    const addMiddleIndex = () =>
      props.selectedItem ? props.items.indexOf(props.selectedItem) + 1 : props.items.length;

    const editingItem = ref(null);
    const editingValue = ref('');

    function startEditing() {
      if (!props.selectedItem) return;
      editingItem.value = props.selectedItem;
      editingValue.value = props.selectedItem;
      nextTick(() => document.querySelector('.rename-input')?.focus());
    }
    function commitEdit() {
      if (!editingItem.value) return;
      emit('rename', editingItem.value, editingValue.value);
      editingItem.value = null;
    }
    function cancelEdit() {
      editingItem.value = null;
    }

    return { isFirst, isLast, addMiddleIndex, editingItem, editingValue, startEditing, commitEdit, cancelEdit };
  }
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  border: var(--base-outline-border);
  border-radius: 4px;
}

.panel-header {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #777;
  /* background-color: var(--left-side-bg-color, #f5f5f5); */
  border-bottom: var(--base-outline-border, 1px solid #ccc);
  user-select: none;
}

.panel-body {
  height: 160px;
  overflow-y: auto;
  padding-bottom: 4px;
}

.panel-row {
  padding: 6px 12px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
  user-select: none;
}

.panel-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.panel-row.selected {
  background-color: rgba(0, 0, 0, 0.08);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-top: var(--base-outline-border, 1px solid #ccc);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-btn {
  width: 24px;
  height: 24px;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  padding: 0;
  background-color: transparent;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  font-size: 18px;
  line-height: 1;
  color: #555;
}

.tool-btn:hover:not(.disabled) {
  opacity: 1;
}

.tool-btn.disabled {
  opacity: 0.25;
  cursor: default;
  pointer-events: none;
}

.up-btn {
  background-image: var(--top-arrow-icon-image);
}

.down-btn {
  background-image: var(--bottom-arrow-icon-image);
}

.add-btn {
  background-image: var(--plus-icon-image);
}

.add-top-btn {
  background-image: var(--plus-top-icon-image);
}

.add-bottom-btn {
  background-image: var(--plus-bottom-icon-image);
}

.delete-btn {
  background-image: var(--trash-icon-image);
}

.rename-btn {
  background-image: var(--edit-icon-image);
}

.rename-input {
  width: 100%;
  font-size: 12px;
  padding: 0 2px;
  border: 1px solid #aaa;
  border-radius: 2px;
  outline: none;
  box-sizing: border-box;
}
</style>
