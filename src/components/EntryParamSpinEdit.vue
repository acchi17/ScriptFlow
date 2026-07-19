<template>
  <div class="entry-param-spin-edit">
    <EntryParamItem
      :entry-id="entryId"
      :param-name="paramDef.name"
      :param-category="paramCategory"
      :param-type="paramDef.dataType"
      :is-param-type-visible="true"
      :is-param-link-visible="true"
    />
    <input
      type="number"
      class="entry-param-spin-edit-input spin-edit-input"
      :step="effectiveStep"
      :value="effectiveValue"
      :disabled="disabled"
      @change="onChange($event.target)"
    />
  </div>
</template>

<script>
import { computed } from 'vue'
import EntryParamItem from './EntryParamItem.vue'

export default {
  name: 'EntryParamSpinEdit',

  components: { EntryParamItem },

  props: {
    entryId:       { type: String,  required: true },
    paramCategory: { type: String,  required: true },
    paramDef:      { type: Object,  required: true },
    value:         { type: Number,  default: 0 },
    disabled:      { type: Boolean, default: false }
  },

  emits: ['update:value'],

  setup(props, { emit }) {
    const effectiveStep = computed(() => {
      return props.paramDef.step != null ? props.paramDef.step : 1
    })
    const effectiveValue = computed(() => {
      return props.value != null ? props.value : 0
    })

    const onChange = (target) => {
      let val = Number(target.value)
      if (isNaN(val)) {
        target.value = effectiveValue.value
        return
      }
      if (props.paramDef.min != null) val = Math.max(Number(props.paramDef.min), val)
      if (props.paramDef.max != null) val = Math.min(Number(props.paramDef.max), val)
      target.value = val
      emit('update:value', val)
    }

    return { effectiveStep, effectiveValue, onChange }
  }
}
</script>

<style scoped>
.entry-param-spin-edit {
  display: flex;
  align-items: center;
  gap: 30px;
}

.entry-param-spin-edit-input {
  flex: 1;
}

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
