<template>
  <div class="main-row">
    <span class="main-label">Items</span>
    <div class="items-body">
      <div class="item-add-row">
        <input class="detail-input" type="text" v-model="newItemText" placeholder="New item" />
        <button class="item-add-btn" @click="addItem">Add</button>
      </div>
      <div v-for="(item, idx) in items" :key="idx" class="item-entry">
        <span class="item-text">{{ item }}</span>
        <button class="item-remove" @click="removeItem(idx)">×</button>
      </div>
    </div>
  </div>
  <LabeledComboBox
    label="Initial"
    :items="defaultItems"
    :value="initial"
    :disabled="!items.length"
    @update:value="onChange" />
</template>

<script>
import { ref, computed } from 'vue';
import LabeledComboBox from './LabeledComboBox.vue';

export default {
  name: 'SimpleListEditor',
  components: { LabeledComboBox },
  props: {
    initial: { type: String, required: true },
    items: { type: Array, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const newItemText = ref('');
    const defaultItems = computed(() =>
      new Map(props.items.map(item => [String(item), String(item)]))
    );

    function addItem() {
      const text = newItemText.value.trim();
      if (!text) return;

      if (props.items.includes(text)) return;
      const newItems = [...props.items, text];
      emit('update', 'items', newItems);
      if (newItems.length === 1) {
        emit('update', 'initial', text);
      }
      newItemText.value = '';
    }

    function removeItem(index) {
      const newItems = props.items.filter((_, i) => i !== index);
      emit('update', 'items', newItems);
      const removedItem = props.items[index];
      if (String(removedItem) === String(props.initial)) {
        emit('update', 'initial', newItems.length ? String(newItems[0]) : '');
      }
    }

    function onChange(value) {
      emit('update', 'initial', value);
    }

    return { newItemText, defaultItems, addItem, removeItem, onChange };
  }
}
</script>

<style scoped>
.main-row {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
}

.main-label {
  width: 100px;
  flex-shrink: 0;
  color: #555;
  user-select: none;
}

.detail-input {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: #fff;
  outline: none;
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
  border: 1px solid #ccc;
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
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
}

.item-add-btn:hover {
  background-color: #f0f0f0;
}
</style>
