<template>
  <div class="entry-param-text-box">
    <EntryParamItem
      :entry-id="entryId"
      :param-name="paramDef.name"
      :param-category="paramCategory"
      :param-type="paramDef.dataType"
      :is-param-type-visible="true"
      :is-param-link-visible="true"
    />
    <input
      type="text"
      class="entry-param-text-box-input text-box-input"
      :value="value"
      :disabled="disabled"
      @change="$emit('update:value', $event.target.value)"
    />
  </div>
</template>

<script>
import EntryParamItem from './EntryParamItem.vue'

export default {
  name: 'EntryParamTextBox',

  components: { EntryParamItem },

  props: {
    entryId:       { type: String,  required: true },
    paramCategory: { type: String,  required: true },
    paramDef:      { type: Object,  required: true },
    value:         { type: String,  default: '' },
    disabled:      { type: Boolean, default: false }
  },

  emits: ['update:value']
}
</script>

<style scoped>
.entry-param-text-box {
  display: flex;
  align-items: center;
  gap: 30px;
}

.entry-param-text-box-input {
  flex: 1;
}

.text-box-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 16px;
  color: #555;
  border: 1px solid #bbb;
  border-radius: 3px;
}
</style>
