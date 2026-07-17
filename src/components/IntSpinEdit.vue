<template>
  <input
    type="number"
    class="spin-edit-input"
    :step="effectiveStep"
    :value="value"
    :disabled="disabled"
    @change="onChange($event.target)"
  />
</template>

<script>
export default {
  name: 'IntSpinEdit',

  props: {
    min:      { type: Number, default: null },
    max:      { type: Number, default: null },
    step:     { type: Number, default: null },
    value:    { type: Number, default: 0 },
    disabled: { type: Boolean, default: false }
  },

  computed: {
    effectiveStep() {
      return this.step !== null ? this.step : 1;
    }
  },

  methods: {
    onChange(target) {
      let val = parseInt(target.value, 10);
      if (this.min !== null) val = Math.max(Number(this.min), val);
      if (this.max !== null) val = Math.min(Number(this.max), val);
      target.value = val;
      this.$emit('update:value', val);
    }
  },

  emits: ['update:value']
}
</script>

<style scoped>
.spin-edit-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 14px;
  color: #555;
  border: 1px solid #bbb;
  border-radius: 3px;
  text-align: left;
}
</style>
