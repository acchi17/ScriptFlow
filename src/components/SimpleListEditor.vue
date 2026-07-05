<template>
  <div class="main-row">
    <span class="main-label">Items</span>
    <div class="items-body">
      <div class="item-add-row">
        <input class="detail-input" type="text" v-model="newItemText" placeholder="New item" />
        <button class="item-add-btn" @click="addItem">Add</button>
      </div>
      <div v-for="(item, idx) in param.items" :key="idx" class="item-entry">
        <span class="item-text">{{ item }}</span>
        <button class="item-remove" @click="removeItem(idx)">×</button>
      </div>
    </div>
  </div>
  <LabeledComboBox
    label="Default"
    :items="defaultItems"
    :value="String(param.default)"
    dataType="string"
    :disabled="!param.items.length"
    @update:value="onDefaultChange" />
</template>

<script>
import { ref, computed } from 'vue';
import LabeledComboBox from './LabeledComboBox.vue';

export default {
  name: 'SimpleListEditor',
  components: { LabeledComboBox },
  props: {
    param: { type: Object, required: true },
  },
  emits: ['update'],
  setup(props, { emit }) {
    const newItemText = ref('');
    const defaultItems = computed(() =>
      new Map(props.param.items.map(item => [String(item), String(item)]))
    );

    function castDefault(value) {
      if (props.param.dataType === 'integer' || props.param.dataType === 'real') {
        return Number(value);
      }
      return value;
    }

    function addItem() {
      const text = newItemText.value.trim();
      if (!text) return;
      if (props.param.items.includes(text)) return;
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

    return { newItemText, defaultItems, addItem, removeItem, onDefaultChange };
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
