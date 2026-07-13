<template>
  <div class="labeled-text-box">
    <span class="main-label">{{ label }}</span>
    <input class="main-input"
           type="text"
           :value="value"
           @change="$emit('update:value', $event.target.value)" />
  </div>
</template>

<script>
export default {
  name: 'LabeledTextBox',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  emits: ['update:value'],
}
</script>

<style scoped>
.labeled-text-box {
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
  font-family: inherit;
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
