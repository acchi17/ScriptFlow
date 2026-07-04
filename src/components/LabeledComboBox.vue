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
    label:    { type: String, required: true },
    items:    { type: Object, required: true }, // label → value pairs
    value:    { type: String, required: true },
    dataType: { type: String, default: 'string', validator: v => ['string', 'number', 'integer'].includes(v) },
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    function normalizeValue(str, dataType) {
      if (dataType === 'number' || dataType === 'integer') {
        const n = Number(str)
        if (isNaN(n)) return ''
        if (dataType === 'integer') return String(Math.trunc(n))
      }
      return str
    }

    function convertValue(str, dataType) {
      if (dataType === 'number' || dataType === 'integer') {
        const n = Number(str)
        if (isNaN(n)) return ''
        if (dataType === 'integer') return Math.trunc(n)
        return n
      }
      return str
    }

    function correctIfInvalid() {
      const corrected = normalizeValue(props.value, props.dataType)
      const converted = convertValue(corrected, props.dataType)
      const values = Object.values(props.items)
      if (values.length > 0 && !values.includes(converted)) {
        emit('update:value', String(values[0]))
      }
    }
    onMounted(correctIfInvalid)
    watch(() => [props.value, props.items], correctIfInvalid, { deep: true })

    function onChange(event) {
      const corrected = normalizeValue(event.target.value, props.dataType)
      emit('update:value', corrected)
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
