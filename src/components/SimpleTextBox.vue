<template>
  <div class="detail-row">
    <span class="detail-label">{{ labelText }}</span>
    <input class="detail-input"
      type="text"
      ref="inputEl"
      :value="value"
      @change="onChange" />
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'SimpleTextBox',
  props: {
    labelText: { type: String, required: true },
    dataType: { type: String, default: 'string', validator: v => ['string', 'number', 'integer'].includes(v) },
    value: { type: String, required: true },
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    const inputEl = ref(null)

    function onChange(event) {
      let newValue = event.target.value

      if (props.dataType === 'number' || props.dataType === 'integer') {
        if (isNaN(Number(newValue))) {
          inputEl.value.value = props.value
          return
        }
        if (props.dataType === 'integer') {
          newValue = String(Math.trunc(Number(newValue)))
          inputEl.value.value = newValue
        }
      }

      emit('update:value', newValue)
    }

    return { inputEl, onChange }
  },
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

.detail-label {
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

.detail-input:disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: default;
}
</style>
