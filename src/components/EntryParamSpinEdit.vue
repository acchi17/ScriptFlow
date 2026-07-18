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
    <RealSpinEdit
      class="entry-param-spin-edit-input"
      :min="paramDef.min"
      :max="paramDef.max"
      :step="paramDef.step"
      :value="value"
      :disabled="disabled"
      @update:value="onValueChange"
    />
  </div>
</template>

<script>
import EntryParamItem from './EntryParamItem.vue'
import RealSpinEdit from './RealSpinEdit.vue'

export default {
  name: 'EntryParamSpinEdit',

  components: { EntryParamItem, RealSpinEdit },

  props: {
    // EntryParamItem props
    entryId:       { type: String,  required: true },
    paramCategory: { type: String,  required: true },
    paramDef:      { type: Object,  required: true },
    // RealSpinEdit props
    value:         { type: Number,  default: 0 },
    disabled:      { type: Boolean, default: false }
  },

  emits: ['update:value'],

  setup(props, { emit }) {
    const onValueChange = (newValue) => {
      emit('update:value', newValue)
    }

    return { onValueChange }
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
</style>
