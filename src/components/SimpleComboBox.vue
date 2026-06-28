<template>
  <div class="detail-row">
    <span class="detail-label">{{ labelText }}</span>
    <select class="detail-select"
      :value="value"
      @change="onChange">
      <option v-for="(optValue, optLabel) in options" :key="optValue" :value="optValue">
        {{ optLabel }}
      </option>
    </select>
  </div>
</template>

<script>
export default {
  name: 'SimpleComboBox',
  props: {
    // Text shown to the left of the dropdown
    labelText:   { type: String, required: true },
    // Dictionary of choices: key = display label, value = stored value
    // e.g. { Integer: 'integer', Real: 'real' }
    options: { type: Object, required: true },
    // The stored value of the currently selected option
    value:   { required: true },
  },
  emits: ['update:value'],
  setup(_, { emit }) {
    function onChange(event) {
      emit('update:value', event.target.value)
    }
    return { onChange }
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

.detail-select {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
}

.detail-select:disabled {
  background-color: #f0f0f0;
  color: #aaa;
  cursor: default;
}
</style>
