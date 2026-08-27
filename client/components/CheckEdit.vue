<template>
  <input
    type="checkbox"
    class="check-edit-input"
    :checked="value"
    :disabled="disabled"
    @change="$emit('update:value', $event.target.checked)"
  />
</template>

<script>
export default {
  name: 'CheckEdit',

  props: {
    value:    { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },

  emits: ['update:value']
}
</script>

<style scoped>
.check-edit-input {
  width: 16px;
  height: 16px;
}
</style>
