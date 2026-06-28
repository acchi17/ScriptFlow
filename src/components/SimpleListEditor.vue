<template>
  <div class="detail-row items-row">
    <span class="detail-label">Items</span>
    <div class="items-body">
      <div v-for="(item, idx) in param.items" :key="idx" class="item-entry">
        <span class="item-text">{{ item }}</span>
        <button class="item-remove" @click="removeItem(idx)">×</button>
      </div>
      <div class="item-add-row">
        <input class="detail-input" type="text" v-model="newItemText" placeholder="New item" />
        <button class="item-add-btn" @click="addItem">Add</button>
      </div>
    </div>
  </div>
  <div class="detail-row">
    <span class="detail-label">Default</span>
    <select class="detail-select"
      :value="String(param.default)"
      :disabled="!param.items.length"
      @change="onDefaultChange($event.target.value)">
      <option v-if="!param.items.length" value="">—</option>
      <option v-for="(item, idx) in param.items" :key="idx" :value="String(item)">{{ item }}</option>
    </select>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'SimpleListEditor',
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const newItemText = ref('');

    function castDefault(value) {
      if (props.param.dataType === 'integer' || props.param.dataType === 'real') {
        return Number(value);
      }
      return value;
    }

    function addItem() {
      const text = newItemText.value.trim();
      if (!text) return;
      const newItems = [...props.param.items, text];
      emit('update', 'items', newItems);
      if (newItems.length === 1) {
        emit('update', 'default', castDefault(text));
      }
      newItemText.value = '';
    }

    function removeItem(index) {
      const newItems = props.param.items.filter((_, i) => i !== index);
      emit('update', 'items', newItems);
      const removedItem = props.param.items[index];
      if (String(removedItem) === String(props.param.default)) {
        emit('update', 'default', newItems.length ? castDefault(newItems[0]) : '');
      }
    }

    function onDefaultChange(value) {
      emit('update', 'default', castDefault(value));
    }

    return { newItemText, addItem, removeItem, onDefaultChange };
  }
}
</script>

<style scoped>
.detail-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.items-row {
  align-items: flex-start;
}

.detail-label {
  width: 90px;
  flex-shrink: 0;
  color: #555;
  user-select: none;
}

.detail-input {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: var(--base-outline-border, 1px solid #ccc);
  border-radius: 3px;
  background-color: #fff;
  outline: none;
}

.detail-select {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: var(--base-outline-border, 1px solid #ccc);
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
}

.detail-select:disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: default;
}

.items-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-entry {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-text {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: var(--base-outline-border, 1px solid #ccc);
  border-radius: 3px;
  background-color: #f8f8f8;
}

.item-remove {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
}

.item-remove:hover {
  color: #c00;
}

.item-add-row {
  display: flex;
  gap: 4px;
}

.item-add-btn {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 6px;
  border: var(--base-outline-border, 1px solid #ccc);
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
}

.item-add-btn:hover {
  background-color: #f0f0f0;
}
</style>
