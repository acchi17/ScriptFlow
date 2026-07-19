<template>
  <input
    type="number"
    class="spin-edit-input"
    :step="effectiveStep"
    :value="effectiveValue"
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
    value:    { type: Number, default: null },
    disabled: { type: Boolean, default: false }
  },

  computed: {
    effectiveStep() {
      return this.step !== null ? this.step : 1;
    },
    effectiveValue() {
      return this.value !== null ? this.value : 0;
    }
  },

  methods: {
    onChange(target) {
      let val = Number(target.value);
      if (isNaN(val)) {
        target.value = this.effectiveValue;
        return;
      }
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
  font-size: 16px;
  color: #555;
  border: 1px solid #bbb;
  border-radius: 3px;
  text-align: left;
}
</style>
