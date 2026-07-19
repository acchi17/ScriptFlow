<template>
  <div class="entry-param-check-edit">
    <EntryParamItem
      :entry-id="entryId"
      :param-name="paramDef.name"
      :param-category="paramCategory"
      :param-type="paramDef.dataType"
      :is-param-type-visible="true"
      :is-param-link-visible="true"
    />
    <input
      type="checkbox"
      class="check-edit-input"
      :checked="value"
      :disabled="disabled"
      @change="$emit('update:value', $event.target.checked)"
    />
  </div>
</template>

<script>
import EntryParamItem from './EntryParamItem.vue'

export default {
  name: 'EntryParamCheckEdit',

  components: { EntryParamItem },

  props: {
    entryId:       { type: String,  required: true },
    paramCategory: { type: String,  required: true },
    paramDef:      { type: Object,  required: true },
    value:         { type: Boolean, default: false },
    disabled:      { type: Boolean, default: false }
  },

  emits: ['update:value']
}
</script>

<style scoped>
.entry-param-check-edit {
  display: flex;
  align-items: center;
  gap: 30px;
}

.check-edit-input {
  width: 16px;
  height: 16px;
}
</style>
