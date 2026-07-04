<template>
  <div class="main-row">
    <span class="main-label">{{ label }}</span>
    <input class="main-input"
      type="text"
      ref="inputEl"
      :value="value"
      @change="onChange" />
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'

export default {
  name: 'LabeledTextBox',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    dataType: { type: String, default: 'string', validator: v => ['string', 'number', 'integer'].includes(v) },
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    const inputEl = ref(null)

    function normalizeValue(str, dataType) {
      if (dataType === 'number' || dataType === 'integer') {
        const n = Number(str)
        if (isNaN(n)) return ''
        if (dataType === 'integer') return String(Math.trunc(n))
      }
      return str
    }

    function correctIfInvalid() {
      const corrected = normalizeValue(props.value, props.dataType)
      if (corrected !== props.value) {
        emit('update:value', corrected)
      }
    }
    onMounted(correctIfInvalid)
    watch(() => [props.value, props.dataType], correctIfInvalid)

    function onChange(event) {
      const corrected = normalizeValue(event.target.value, props.dataType)
      if (corrected !== event.target.value) inputEl.value.value = corrected
      emit('update:value', corrected)
    }

    return { inputEl, onChange }
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

.main-input {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: #fff;
  outline: none;
}

.main-input:disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: default;
}
</style>
