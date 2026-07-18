<template>
  <div class="entry-param-spin-edit">
    <EntryParamItem
      :entry-id="entryId"
      :param-name="paramName"
      :param-category="paramCategory"
      :param-type="paramType"
      :is-param-type-visible="isParamTypeVisible"
      :is-param-link-visible="isParamLinkVisible"
    />
    <RealSpinEdit
      class="entry-param-spin-edit-input"
      :min="min"
      :max="max"
      :step="step"
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
    entryId:            { type: String,  required: true },
    paramName:          { type: String,  required: true },
    paramCategory:      { type: String,  required: true },
    paramType:          { type: String,  default: null },
    isParamTypeVisible: { type: Boolean, default: true },
    isParamLinkVisible: { type: Boolean, default: true },
    // RealSpinEdit props
    min:                { type: Number,  default: null },
    max:                { type: Number,  default: null },
    step:               { type: Number,  default: null },
    value:              { type: Number,  default: 0 },
    disabled:           { type: Boolean, default: false }
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
