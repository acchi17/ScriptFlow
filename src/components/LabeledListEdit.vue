<template>
  <div class="labeled-list-edit">
    <span class="main-label">{{ label }}</span>
    <div class="items-body">
      <div class="item-add-row">
        <input class="item-add-input" type="text" v-model="itemText" placeholder="New item" />
        <button class="item-add-btn" @click="addItem">Add</button>
      </div>
      <div v-for="(item, idx) in items" :key="idx" class="item-entry">
        <span class="item-text">{{ item }}</span>
        <button class="item-remove-btn" @click="removeItem(idx)">×</button>
      </div>
    </div>
  </div>
  <LabeledComboBox
    label="Initial"
    :items="itemTexts"
    :value="value"
    :disabled="!items.length"
    @update:value="$emit('update:value', $event)" />
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import LabeledComboBox from './LabeledComboBox.vue';

export default {
  name: 'LabeledListEdit',
  components: { LabeledComboBox },
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    items: { type: Array, required: true },
  },
  emits: ['update:value', 'update:items'],
  setup(props, { emit }) {
    const itemText = ref('');
    const itemTexts = computed(() =>
      new Map(props.items.map(item => [String(item), String(item)]))
    );

    function addItem() {
      const text = itemText.value.trim();
      if (!text) return;

      if (props.items.includes(text)) return;
      const newItems = [...props.items, text];
      emit('update:items', newItems);
      itemText.value = '';
    }

    function removeItem(index) {
      const newItems = props.items.filter((_, i) => i !== index);
      emit('update:items', newItems);
    }

    function correctIfInvalid() {
      const values = props.items.map(String);
      if (!values.includes(props.value)) {
        emit('update:value', values.length > 0 ? values[0] : '');
      }
    }
    onMounted(correctIfInvalid);
    watch(() => [props.value, props.items], correctIfInvalid, { deep: true });

    return { itemText, itemTexts, addItem, removeItem };
  }
}
</script>

<style scoped>
.labeled-list-edit {
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

.items-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-add-row {
  display: flex;
  gap: 4px;
}

.item-add-input {
  flex: 1;
  font-family: inherit;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: #fff;
  outline: none;
}

.item-add-btn {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 34px;
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

.item-remove-btn {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 34px;
  height: 18px;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  border: none;
  background: none;
  color: #999;
  cursor: pointer;
}

.item-remove-btn:hover {
  color: #c00;
}
</style>
