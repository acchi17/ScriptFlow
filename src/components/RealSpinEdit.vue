<template>
  <input
    type="number"
    class="spin-edit-input"
    :min="min"
    :max="max"
    :step="effectiveStep"
    :value="value"
    :disabled="disabled"
    @change="onChange($event.target)"
  />
</template>

<script>
export default {
  name: 'RealSpinEdit',

  props: {
    min:      { type: Number, default: null },
    max:      { type: Number, default: null },
    step:     { type: Number, default: null },
    value:    { type: Number, default: 0 },
    disabled: { type: Boolean, default: false }
  },

  computed: {
    effectiveStep() {
      return this.step !== null ? this.step : 0.1;
    }
  },

  methods: {
    onChange(target) {
      let val = parseFloat(target.value);
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
  width: 90px;
  padding: 4px 4px;
  font-size: 16px;
  color: #555;
  border: 1px solid #bbb;
  border-radius: 3px;
}
</style>
