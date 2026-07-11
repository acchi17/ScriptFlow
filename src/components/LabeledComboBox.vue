<template>
  <div class="labeled-combo-box">
    <span class="main-label">{{ label }}</span>
    <select class="main-select"
            :value="value"
            :disabled="disabled"
            @change="$emit('update:value', $event.target.value)">
      <template v-if="!disabled">
        <option v-for="[itemLabel, itemValue] in items" :key="itemValue" :value="itemValue">
          {{ itemLabel }}
        </option>
      </template>
    </select>
  </div>
</template>

<script>
import { onMounted, watch } from 'vue'

export default {
  name: 'LabeledComboBox',
  props: {
    label:    { type: String, required: true },
    value:    { type: String, required: true },
    items:    { type: Map, required: true },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    function correctIfInvalid() {
      const values = [...props.items.values()]
      if (!values.includes(props.value)) {
        emit('update:value', values.length > 0 ? String(values[0]) : '')
      }
    }
    onMounted(correctIfInvalid)
    watch(() => [props.value, props.items], correctIfInvalid, { deep: true })
  },
}
</script>

<style scoped>
.labeled-combo-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.main-label {
  width: 100px;
  flex-shrink: 0;
  color: #555;
  user-select: none;
}

.main-select {
  flex: 1;
  font-family: inherit;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
}

.main-select:disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: default;
}
</style>
