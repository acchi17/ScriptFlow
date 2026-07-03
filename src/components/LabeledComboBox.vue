<template>
  <div class="main-row">
    <span class="main-label">{{ label }}</span>
    <select class="main-select"
      :value="value"
      @change="onChange">
      <option v-for="(itemValue, itemLabel) in items" :key="itemValue" :value="itemValue">
        {{ itemLabel }}
      </option>
    </select>
  </div>
</template>

<script>
import { onMounted, watch } from 'vue'

export default {
  name: 'LabeledComboBox',
  props: {
    label: { type: String, required: true },
    items: { type: Object, required: true }, // dictionary of label/value pairs
    value: { required: true },
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    function correctIfInvalid() {
      const values = Object.values(props.items)
      if (values.length > 0 && !values.includes(props.value)) {
        emit('update:value', values[0])
      }
    }
    onMounted(correctIfInvalid)
    watch(() => [props.value, props.items], correctIfInvalid, { deep: true })

    function onChange(event) {
      const typed = Object.values(props.items)[event.target.selectedIndex]
      if (typed !== undefined) emit('update:value', typed)
    }
    return { onChange }
  },
}
</script>

<style scoped>
.main-row {
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
